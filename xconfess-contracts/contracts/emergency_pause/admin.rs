use soroban_sdk::{Address, Env};

use crate::emergency_pause::errors::PauseError;
use crate::emergency_pause::storage::DataKey;

pub fn set_admin(env: &Env, admin: Address) {
    admin.require_auth();

    env.storage().instance().set(&DataKey::Admin, &admin);
}

pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("Admin not set")
}

pub fn require_admin(env: &Env) -> Result<Address, PauseError> {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(PauseError::Unauthorized)?;

    admin.require_auth();
    Ok(admin)
}
