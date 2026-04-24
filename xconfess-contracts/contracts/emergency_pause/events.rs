use soroban_sdk::{contractevent, Address, Env, String};

#[contractevent(topics = ["paused"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PausedEvent {
    #[topic]
    pub actor: Address,
    pub reason: String,
}

#[contractevent(topics = ["unpaused"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UnpausedEvent {
    #[topic]
    pub actor: Address,
    pub reason: String,
}

pub fn emit_paused(env: &Env, actor: &Address, reason: String) {
    PausedEvent {
        actor: actor.clone(),
        reason,
    }
    .publish(env);
}

pub fn emit_unpaused(env: &Env, actor: &Address, reason: String) {
    UnpausedEvent {
        actor: actor.clone(),
        reason,
    }
    .publish(env);
}
