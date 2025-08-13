use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AuditInput {
    pub algo_id: u8,           // 1 = Dilithium-5
    pub message: String,       // message to verify
    pub signature: String,     // Dilithium signature (hex)
    pub session_nonce: u64,
    pub expiry: u64,
    pub wallet: String,        // wallet address
}

impl AuditInput {
    pub fn to_binary(&self) -> Result<Vec<u8>, String> {
        // For now, use JSON encoding - later switch to RISC Zero serde
        serde_json::to_vec(self).map_err(|e| e.to_string())
    }
    
    pub fn from_binary(data: &[u8]) -> Result<Self, String> {
        serde_json::from_slice(data).map_err(|e| e.to_string())
    }
}