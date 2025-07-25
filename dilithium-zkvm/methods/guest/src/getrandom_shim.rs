// A simple implementation for getrandom that works in the zkVM
use core::sync::atomic::{AtomicU64, Ordering};

static COUNTER: AtomicU64 = AtomicU64::new(1);

/// Custom getrandom implementation for the zkVM
/// This is a deterministic implementation that should only be used for testing
#[no_mangle]
pub extern "C" fn getrandom(dest: *mut u8, len: usize, _flags: u32) -> i32 {
    let dest_slice = unsafe { core::slice::from_raw_parts_mut(dest, len) };
    
    for i in 0..len {
        let counter = COUNTER.fetch_add(1, Ordering::SeqCst);
        // Simple deterministic PRNG using a counter
        dest_slice[i] = ((counter + i as u64) % 256) as u8;
    }
    
    0 // Success
}