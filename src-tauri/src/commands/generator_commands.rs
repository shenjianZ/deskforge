//! 生成器命令
//!
//! 定义生成器中心使用的 Tauri 命令

use crate::{
    models::generator::{
        ApiKeyGenerateOptions, GeneratorItemsResult, HashGenerateOptions, HashGenerateResult, IdentityGenerateOptions,
        JwtDecodeOptions, JwtDecodeResult, JwtGenerateOptions, JwtGenerateResult, NanoIdGenerateOptions,
        PasswordGenerateOptions, PaymentCardGenerateOptions, RandomValueGenerateOptions, UserDataGenerateOptions,
        UserDataGenerateResult, UserProfileGenerateOptions, UuidGenerateOptions,
    },
    services::generator_service::GeneratorService,
};

#[tauri::command]
pub fn generate_uuid(options: UuidGenerateOptions) -> Result<GeneratorItemsResult, String> {
    GeneratorService::generate_uuid(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_nanoid(options: NanoIdGenerateOptions) -> Result<GeneratorItemsResult, String> {
    GeneratorService::generate_nanoid(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_random_value(options: RandomValueGenerateOptions) -> Result<GeneratorItemsResult, String> {
    GeneratorService::generate_random_value(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_password(options: PasswordGenerateOptions) -> Result<GeneratorItemsResult, String> {
    GeneratorService::generate_password(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_api_key(options: ApiKeyGenerateOptions) -> Result<GeneratorItemsResult, String> {
    GeneratorService::generate_api_key(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_hash(options: HashGenerateOptions) -> Result<HashGenerateResult, String> {
    GeneratorService::generate_hash(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_jwt_mock(options: JwtGenerateOptions) -> Result<JwtGenerateResult, String> {
    GeneratorService::generate_jwt(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn decode_jwt_mock(options: JwtDecodeOptions) -> Result<JwtDecodeResult, String> {
    GeneratorService::decode_jwt(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_user_persona(options: UserDataGenerateOptions) -> Result<UserDataGenerateResult, String> {
    GeneratorService::generate_user_persona(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_user_contact(options: UserDataGenerateOptions) -> Result<UserDataGenerateResult, String> {
    GeneratorService::generate_user_contact(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_user_address(options: UserDataGenerateOptions) -> Result<UserDataGenerateResult, String> {
    GeneratorService::generate_user_address(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_user_company(options: UserDataGenerateOptions) -> Result<UserDataGenerateResult, String> {
    GeneratorService::generate_user_company(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_identity_document(options: IdentityGenerateOptions) -> Result<UserDataGenerateResult, String> {
    GeneratorService::generate_identity_document(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_payment_card(options: PaymentCardGenerateOptions) -> Result<UserDataGenerateResult, String> {
    GeneratorService::generate_payment_card(&options).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_user_profile(options: UserProfileGenerateOptions) -> Result<UserDataGenerateResult, String> {
    GeneratorService::generate_user_profile(&options).map_err(|error| error.to_string())
}
