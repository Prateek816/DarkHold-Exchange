use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use darkhold_core::Command;
use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const WAL_FILE: &str = "commands.wal";
pub const MAX_PAYLOAD: u32 = 1024 * 1024;
pub const REC_HEADER: u8 = 0x01;
pub const REC_COMMAND: u8 = 0x02;
const FRAME_OVERHEAD: usize = 9;

#[derive(Debug, Error)]
pub enum WalError {
    #[error("wal io error: {0}")]
    Io(#[from] io::Error),
    #[error("WAL header missing or corrupt in {path}: {reason}. Operator action: move or delete this file and restart (a new epoch will be created)")]
    BadHeader { path: String, reason: String },
    #[error("WAL fatal record error at offset {offset}: {reason}")]
    Fatal { offset: u64, reason: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalHeader {
    pub magic: String,
    pub version: u32,
    pub engine_epoch: String,
    pub created_at_ms: u64,
}

#[derive(Debug)]
pub struct WalRecord {
    pub ts: u64,
    pub cmd: Command,
}

#[derive(Debug)]
pub struct WalContents {
    pub header: WalHeader,
    pub records: Vec<WalRecord>,
    pub valid_end: u64,
    pub discarded: u64,
}

#[derive(Deserialize)]
struct CmdRec {
    ts: u64,
    cmd: Command,
}

pub fn wal_path(dir: &Path) -> PathBuf {
    dir.join(WAL_FILE)
}

pub fn encode_frame(ty: u8, payload: &[u8]) -> Vec<u8> {
    let mut h = crc32fast::Hasher::new();
    h.update(&[ty]);
    h.update(payload);
    let crc = h.finalize();
    let mut out = Vec::with_capacity(FRAME_OVERHEAD + payload.len());
    out.extend_from_slice(&(payload.len() as u32).to_le_bytes());
    out.extend_from_slice(&crc.to_le_bytes());
    out.push(ty);
    out.extend_from_slice(payload);
    out
}

/// `cmd_json` is the command serialized exactly as in the HTTP form.
pub fn encode_command_record(ts: u64, cmd_json: &str) -> Vec<u8> {
    let payload = format!("{{\"ts\":{},\"cmd\":{}}}", ts, cmd_json);
    encode_frame(REC_COMMAND, payload.as_bytes())
}

enum Frame<'a> {
    Ok {
        ty: u8,
        payload: &'a [u8],
        end: usize,
    },
    End,
    Bad,
}

fn next_frame(data: &[u8], pos: usize) -> Frame<'_> {
    if pos == data.len() {
        return Frame::End;
    }
    if data.len() - pos < FRAME_OVERHEAD {
        return Frame::Bad;
    }
    let len = u32::from_le_bytes(data[pos..pos + 4].try_into().unwrap());
    let crc = u32::from_le_bytes(data[pos + 4..pos + 8].try_into().unwrap());
    let ty = data[pos + 8];
    if len > MAX_PAYLOAD {
        return Frame::Bad;
    }
    let end = pos + FRAME_OVERHEAD + len as usize;
    if end > data.len() {
        return Frame::Bad;
    }
    let payload = &data[pos + FRAME_OVERHEAD..end];
    let mut h = crc32fast::Hasher::new();
    h.update(&[ty]);
    h.update(payload);
    if h.finalize() != crc {
        return Frame::Bad;
    }
    Frame::Ok { ty, payload, end }
}

pub fn read_all(path: &Path) -> Result<WalContents, WalError> {
    let data = fs::read(path)?;
    let p = path.display().to_string();
    let mut pos = 0usize;
    let mut header: Option<WalHeader> = None;
    let mut records = Vec::new();
    loop {
        match next_frame(&data, pos) {
            Frame::Ok { ty, payload, end } => {
                if header.is_none() {
                    if ty != REC_HEADER {
                        return Err(WalError::BadHeader {
                            path: p,
                            reason: "first record is not a header".into(),
                        });
                    }
                    let h: WalHeader =
                        serde_json::from_slice(payload).map_err(|e| WalError::BadHeader {
                            path: p.clone(),
                            reason: e.to_string(),
                        })?;
                    if h.magic != "DKWAL" || h.version != 1 {
                        return Err(WalError::BadHeader {
                            path: p,
                            reason: "bad magic or version".into(),
                        });
                    }
                    header = Some(h);
                } else if ty == REC_COMMAND {
                    let r: CmdRec =
                        serde_json::from_slice(payload).map_err(|e| WalError::Fatal {
                            offset: pos as u64,
                            reason: format!("unparseable command record with valid checksum: {e}"),
                        })?;
                    records.push(WalRecord {
                        ts: r.ts,
                        cmd: r.cmd,
                    });
                } else {
                    return Err(WalError::Fatal {
                        offset: pos as u64,
                        reason: format!("unknown record type {ty}"),
                    });
                }
                pos = end;
            }
            Frame::End | Frame::Bad => break,
        }
    }
    let header = header.ok_or_else(|| WalError::BadHeader {
        path: p,
        reason: "no valid header record".into(),
    })?;
    Ok(WalContents {
        header,
        records,
        valid_end: pos as u64,
        discarded: (data.len() - pos) as u64,
    })
}

pub fn truncate_to(path: &Path, offset: u64) -> Result<(), WalError> {
    let f = OpenOptions::new().write(true).open(path)?;
    f.set_len(offset)?;
    f.sync_all()?;
    Ok(())
}

fn sync_dir(dir: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        File::open(dir)?.sync_all()?;
    }
    #[cfg(not(unix))]
    {
        let _ = dir;
    }
    Ok(())
}

/// What the core thread needs from a WAL (lets tests inject a fake).
pub trait WalSink: Send {
    fn append(&mut self, bytes: &[u8]) -> io::Result<()>;
    fn sync(&mut self) -> io::Result<Duration>;
    fn bytes_written(&self) -> u64;
    fn fsync_count(&self) -> u64;
}

pub struct Wal {
    file: File,
    bytes_written: u64,
    fsync_count: u64,
}

impl Wal {
    pub fn create(dir: &Path, epoch: &str, created_at_ms: u64) -> Result<Wal, WalError> {
        fs::create_dir_all(dir)?;
        let path = wal_path(dir);
        let mut file = OpenOptions::new()
            .append(true)
            .create_new(true)
            .open(&path)?;
        let h = WalHeader {
            magic: "DKWAL".into(),
            version: 1,
            engine_epoch: epoch.to_string(),
            created_at_ms,
        };
        let payload =
            serde_json::to_vec(&h).map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
        let frame = encode_frame(REC_HEADER, &payload);
        file.write_all(&frame)?;
        file.sync_all()?;
        sync_dir(dir)?;
        Ok(Wal {
            file,
            bytes_written: frame.len() as u64,
            fsync_count: 0,
        })
    }

    pub fn open_for_append(path: &Path) -> Result<Wal, WalError> {
        let file = OpenOptions::new().append(true).open(path)?;
        let bytes_written = file.metadata()?.len();
        Ok(Wal {
            file,
            bytes_written,
            fsync_count: 0,
        })
    }

    pub fn append_batch(&mut self, bytes: &[u8]) -> io::Result<()> {
        self.file.write_all(bytes)?;
        self.bytes_written += bytes.len() as u64;
        Ok(())
    }

    pub fn sync(&mut self) -> io::Result<Duration> {
        let t = Instant::now();
        self.file.sync_data()?;
        self.fsync_count += 1;
        Ok(t.elapsed())
    }
}

impl WalSink for Wal {
    fn append(&mut self, bytes: &[u8]) -> io::Result<()> {
        self.append_batch(bytes)
    }
    fn sync(&mut self) -> io::Result<Duration> {
        Wal::sync(self)
    }
    fn bytes_written(&self) -> u64 {
        self.bytes_written
    }
    fn fsync_count(&self) -> u64 {
        self.fsync_count
    }
}
