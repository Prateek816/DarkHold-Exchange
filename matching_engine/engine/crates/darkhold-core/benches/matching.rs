#[path = "../tests/support/common.rs"]
mod common;
use common::*;
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_rest(c: &mut Criterion) {
    c.bench_function("rest_limit_order", |b| {
        let mut e = engine_with_asset(1000);
        let mut n = 0u64;
        b.iter(|| {
            n += 1;
            let cmd = limit(&uuid_n(n), &format!("U{}", n % 50), "BUY", 1, 50 + n % 20);
            black_box(process_json(&mut e, &cmd, 1000 + n));
        })
    });
}

fn bench_cross(c: &mut Criterion) {
    c.bench_function("cross_one_for_one", |b| {
        let mut e = engine_with_asset(1000);
        let mut n = 0u64;
        b.iter(|| {
            n += 2;
            black_box(process_json(
                &mut e,
                &limit(&uuid_n(n), "U1", "SELL", 1, 100),
                1000 + n,
            ));
            black_box(process_json(
                &mut e,
                &limit(&uuid_n(n + 1), "U2", "BUY", 1, 100),
                1000 + n,
            ));
        })
    });
}

fn bench_cancel(c: &mut Criterion) {
    c.bench_function("rest_then_cancel", |b| {
        let mut e = engine_with_asset(1000);
        let mut n = 0u64;
        b.iter(|| {
            n += 1;
            black_box(process_json(
                &mut e,
                &limit(&uuid_n(n), "U1", "BUY", 1, 90),
                1000 + n,
            ));
            black_box(process_json(&mut e, &cancel(&uuid_n(n), "USER"), 1000 + n));
        })
    });
}

criterion_group!(benches, bench_rest, bench_cross, bench_cancel);
criterion_main!(benches);
