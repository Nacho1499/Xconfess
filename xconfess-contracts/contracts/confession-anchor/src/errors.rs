#![allow(dead_code)]

// Re-export shared error definitions from parent workspace
pub use xconfess_contract::errors::{
    codes, ContractError, ErrorClassification, ERROR_REGISTRY_VERSION,
};
