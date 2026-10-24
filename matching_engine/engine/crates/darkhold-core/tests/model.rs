//! Engine vs naive reference model: identical random streams must give identical output.
#[path = "support/common.rs"]
mod common;
#[path = "support/reference.rs"]
mod reference;
use common::*;
use reference::Reference;

#[test]
fn engine_matches_reference() {
    for seed in 0..40u64 {
        let mut eng = new_engine();
        let mut rf = Reference::new(EPOCH);
        let mut g = Gen::new(seed);
        let mut cmds = Gen::setup();
        for _ in 0..300 {
            cmds.push(g.next());
        }
        for (i, c) in cmds.iter().enumerate() {
            let ts = 1000 + i as u64;
            let (e_evs, e_rep) = process_json(&mut eng, c, ts);
            let (r_evs, r_rep) = rf.process(c, ts);
            assert_eq!(e_evs, r_evs, "seed {seed} cmd {i} events: {c}");
            assert_eq!(e_rep, r_rep, "seed {seed} cmd {i} reply: {c}");
            for a in ASSETS {
                if !rf.knows(a) {
                    continue;
                }
                let b = book_json(&eng, a);
                let (bids, asks) = rf.book_levels(a);
                assert_eq!(
                    norm_levels(&b["bids"]),
                    bids,
                    "seed {seed} cmd {i} bids {a}"
                );
                assert_eq!(
                    norm_levels(&b["asks"]),
                    asks,
                    "seed {seed} cmd {i} asks {a}"
                );
            }
        }
        check_invariants(&eng);
    }
}
