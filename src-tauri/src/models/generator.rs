//! 生成器相关数据模型
//!
//! 定义生成器中心使用的数据结构

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum HashAlgorithm {
    Md5,
    Sha1,
    Sha256,
    Sha512,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RandomValueMode {
    Integer,
    Float,
    String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum CountryPreset {
    #[serde(rename = "cn")]
    Cn,
    #[serde(rename = "us")]
    Us,
    #[serde(rename = "uk")]
    Uk,
    #[serde(rename = "jp")]
    Jp,
    #[serde(rename = "de")]
    De,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UuidGenerateOptions {
    #[serde(default = "default_batch_count")]
    pub count: usize,
    #[serde(default)]
    pub uppercase: bool,
    #[serde(default)]
    pub remove_hyphens: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NanoIdGenerateOptions {
    #[serde(default = "default_length_21")]
    pub length: usize,
    #[serde(default = "default_batch_count")]
    pub count: usize,
    #[serde(default)]
    pub alphabet: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RandomValueGenerateOptions {
    pub mode: RandomValueMode,
    #[serde(default = "default_batch_count")]
    pub count: usize,
    #[serde(default = "default_min")]
    pub min: i64,
    #[serde(default = "default_max")]
    pub max: i64,
    #[serde(default = "default_decimal_places")]
    pub decimal_places: u8,
    #[serde(default = "default_length_16")]
    pub length: usize,
    #[serde(default)]
    pub charset: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PasswordGenerateOptions {
    #[serde(default = "default_length_16")]
    pub length: usize,
    #[serde(default = "default_batch_count")]
    pub count: usize,
    #[serde(default = "default_true")]
    pub include_uppercase: bool,
    #[serde(default = "default_true")]
    pub include_lowercase: bool,
    #[serde(default = "default_true")]
    pub include_numbers: bool,
    #[serde(default = "default_true")]
    pub include_symbols: bool,
    #[serde(default)]
    pub exclude_similar: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyGenerateOptions {
    #[serde(default)]
    pub prefix: String,
    #[serde(default = "default_length_24")]
    pub length: usize,
    #[serde(default = "default_batch_count")]
    pub count: usize,
    #[serde(default = "default_separator")]
    pub separator: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HashGenerateOptions {
    pub algorithm: HashAlgorithm,
    pub input: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JwtGenerateOptions {
    pub payload_json: String,
    #[serde(default)]
    pub secret: String,
    #[serde(default)]
    pub header_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JwtDecodeOptions {
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserDataGenerateOptions {
    pub country: CountryPreset,
    #[serde(default = "default_batch_count")]
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentityGenerateOptions {
    pub country: CountryPreset,
    #[serde(default = "default_batch_count")]
    pub count: usize,
    #[serde(default)]
    pub document_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentCardGenerateOptions {
    pub country: CountryPreset,
    #[serde(default = "default_batch_count")]
    pub count: usize,
    #[serde(default)]
    pub brand: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfileGenerateOptions {
    pub country: CountryPreset,
    #[serde(default = "default_batch_count")]
    pub count: usize,
    #[serde(default = "default_true")]
    pub include_profile: bool,
    #[serde(default = "default_true")]
    pub include_contact: bool,
    #[serde(default = "default_true")]
    pub include_address: bool,
    #[serde(default = "default_true")]
    pub include_company: bool,
    #[serde(default)]
    pub include_identity: bool,
    #[serde(default)]
    pub include_payment: bool,
    #[serde(default)]
    pub include_account: bool,
    #[serde(default)]
    pub include_preferences: bool,
    #[serde(default)]
    pub include_device: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratorItemsResult {
    pub text: String,
    pub items: Vec<String>,
    pub meta: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HashGenerateResult {
    pub algorithm: String,
    pub value: String,
    pub meta: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JwtGenerateResult {
    pub token: String,
    pub header_pretty: String,
    pub payload_pretty: String,
    pub meta: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JwtDecodeResult {
    pub header_pretty: String,
    pub payload_pretty: String,
    pub signature: String,
    pub meta: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserDataGenerateResult {
    pub country: String,
    pub locale_label: String,
    pub text: String,
    pub items: Vec<String>,
    pub json: String,
    pub meta: Vec<String>,
}

fn default_batch_count() -> usize {
    1
}

fn default_length_21() -> usize {
    21
}

fn default_length_16() -> usize {
    16
}

fn default_length_24() -> usize {
    24
}

fn default_min() -> i64 {
    0
}

fn default_max() -> i64 {
    1000
}

fn default_decimal_places() -> u8 {
    2
}

fn default_true() -> bool {
    true
}

fn default_separator() -> String {
    "_".to_string()
}
