//! Base64 工具函数
//!
//! 提供 Base64 编解码与校验算法实现

use base64::{engine::general_purpose, engine::GeneralPurpose, Engine as _};

use crate::models::base64_tool::{Base64ProcessConfig, Base64Variant};

fn create_engine(config: &Base64ProcessConfig) -> GeneralPurpose {
    match (config.variant, config.padding) {
        (Base64Variant::Standard, true) => general_purpose::STANDARD,
        (Base64Variant::Standard, false) => general_purpose::STANDARD_NO_PAD,
        (Base64Variant::UrlSafe, true) => general_purpose::URL_SAFE,
        (Base64Variant::UrlSafe, false) => general_purpose::URL_SAFE_NO_PAD,
    }
}

/// 将文本编码为 Base64
pub fn encode_base64(input: &str, config: &Base64ProcessConfig) -> String {
    create_engine(config).encode(input.as_bytes())
}

/// 将 Base64 解码为 UTF-8 文本
pub fn decode_base64(input: &str, config: &Base64ProcessConfig) -> Result<String, String> {
    let bytes = create_engine(config)
        .decode(input.trim())
        .map_err(|error| format!("Base64 解码失败: {}", error))?;

    String::from_utf8(bytes).map_err(|_| "解码结果不是有效的 UTF-8 文本".to_string())
}

/// 校验输入是否为有效的 Base64
pub fn validate_base64(input: &str, config: &Base64ProcessConfig) -> Result<(), String> {
    create_engine(config)
        .decode(input.trim())
        .map(|_| ())
        .map_err(|error| format!("Base64 校验失败: {}", error))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_standard_base64() {
        let result = encode_base64("DeskForge", &Base64ProcessConfig::default());
        assert_eq!(result, "RGVza0Zvcmdl");
    }

    #[test]
    fn test_decode_standard_base64() {
        let result = decode_base64("RGVza0Zvcmdl", &Base64ProcessConfig::default()).unwrap();
        assert_eq!(result, "DeskForge");
    }

    #[test]
    fn test_decode_invalid_base64() {
        let result = decode_base64("not-valid-@@@", &Base64ProcessConfig::default());
        assert!(result.is_err());
    }
}
