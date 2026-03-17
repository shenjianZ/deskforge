//! XML 格式化工具函数
//!
//! 使用专业解析库（roxmltree + quick-xml）进行 XML 处理

use crate::models::xml_format::{FormatMode, XmlFormatConfig};

/// 格式化 XML 字符串
///
/// 对输入的 XML 字符串进行格式化，支持美化和压缩模式
///
/// # 参数
///
/// * `input` - 输入的 XML 字符串
/// * `config` - 格式化配置
///
/// # 返回
///
/// 返回格式化后的 XML 字符串
///
/// # 错误
///
/// 当 XML 解析失败时返回错误
pub fn format_xml(input: &str, config: &XmlFormatConfig) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("输入内容不能为空".to_string());
    }

    match config.mode {
        FormatMode::Pretty => prettify_xml(input, config.indent),
        FormatMode::Compact => compact_xml(input),
    }
}

/// 美化 XML 字符串（使用 quick-xml Writer）
fn prettify_xml(input: &str, indent_size: u32) -> Result<String, String> {
    use quick_xml::reader::Reader;
    use quick_xml::writer::Writer;

    let mut reader = Reader::from_str(input);
    reader.config_mut().trim_text(true);
    let writer = Writer::new_with_indent(Vec::new(), b' ', indent_size as usize);
    rewrite_xml(&mut reader, writer)
}

/// 压缩 XML 字符串
pub fn compact_xml(input: &str) -> Result<String, String> {
    use quick_xml::reader::Reader;
    use quick_xml::writer::Writer;

    let mut reader = Reader::from_str(input);
    reader.config_mut().trim_text(true);

    let writer = Writer::new(Vec::new());
    rewrite_xml(&mut reader, writer)
}

fn rewrite_xml(
    reader: &mut quick_xml::reader::Reader<&[u8]>,
    mut writer: quick_xml::writer::Writer<Vec<u8>>,
) -> Result<String, String> {
    use quick_xml::events::Event;

    let mut buf = Vec::new();

    loop {
        let event = reader
            .read_event_into(&mut buf)
            .map_err(|e| format!("XML 解析错误: {}", e))?;

        let should_write = match &event {
            Event::Text(e) => e
                .unescape()
                .map(|text| !text.trim().is_empty())
                .unwrap_or(true),
            Event::Eof => break,
            _ => true,
        };

        if should_write {
            writer
                .write_event(event.borrow())
                .map_err(|e| format!("XML 写入失败: {}", e))?;
        }

        buf.clear();
    }

    let result = String::from_utf8(writer.into_inner())
        .map_err(|e| format!("编码转换失败: {}", e))?;

    Ok(result)
}

/// 验证 XML 字符串（使用 roxmltree）
pub fn validate_xml(input: &str) -> XmlValidateResult {
    if input.trim().is_empty() {
        return XmlValidateResult {
            is_valid: false,
            error_message: Some("输入内容不能为空".to_string()),
            error_line: Some(1),
        };
    }

    match roxmltree::Document::parse(input) {
        Ok(_) => XmlValidateResult {
            is_valid: true,
            error_message: None,
            error_line: None,
        },
        Err(e) => {
            // roxmltree 提供了详细的错误位置信息
            let error_line = Some(e.pos().row as usize);

            XmlValidateResult {
                is_valid: false,
                error_message: Some(e.to_string()),
                error_line,
            }
        }
    }
}

/// XML 验证结果结构
#[derive(Debug, Clone)]
pub struct XmlValidateResult {
    pub is_valid: bool,
    pub error_message: Option<String>,
    pub error_line: Option<usize>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prettify_simple_xml() {
        let input = "<root><item>test</item></root>";
        let config = XmlFormatConfig::default();
        let result = format_xml(input, &config).unwrap();
        assert!(result.contains('\n'));
        println!("Formatted:\n{}", result);
    }

    #[test]
    fn test_prettify_xml_with_attributes() {
        let input = r#"<?xml version="1.0" encoding="UTF-8"?><root><item id="1"><name>示例</name></item></root>"#;
        let config = XmlFormatConfig::default();
        let result = format_xml(input, &config).unwrap();
        assert!(result.contains('\n'));
        println!("Formatted with attributes:\n{}", result);
    }

    #[test]
    fn test_prettify_xml_with_namespace() {
        let input = r#"<ns:root xmlns:ns="http://example.com"><ns:item>test</ns:item></ns:root>"#;
        let config = XmlFormatConfig::default();
        let result = format_xml(input, &config).unwrap();
        assert!(result.contains('\n'));
        assert!(result.contains("ns:"));
        println!("Formatted with namespace:\n{}", result);
    }

    #[test]
    fn test_prettify_xml_with_cdata() {
        let input = r#"<root><data><![CDATA[<special>data</special>]]></data></root>"#;
        let config = XmlFormatConfig::default();
        let result = format_xml(input, &config).unwrap();
        assert!(result.contains("<![CDATA["));
        println!("Formatted with CDATA:\n{}", result);
    }

    #[test]
    fn test_prettify_xml_with_mixed_content() {
        let input = "<p>Hello <b>world</b> text</p>";
        let config = XmlFormatConfig::default();
        let result = format_xml(input, &config).unwrap();
        assert!(result.contains('\n'));
        println!("Formatted with mixed content:\n{}", result);
    }

    #[test]
    fn test_prettify_xml_with_comments() {
        let input = "<root><!-- comment --><item>test</item></root>";
        let config = XmlFormatConfig::default();
        let result = format_xml(input, &config).unwrap();
        assert!(result.contains("<!--"));
        println!("Formatted with comments:\n{}", result);
    }

    #[test]
    fn test_prettify_xml_with_gt_in_attribute() {
        let input = r#"<root><item text="1 > 2">test</item></root>"#;
        let config = XmlFormatConfig::default();
        let result = format_xml(input, &config).unwrap();
        assert!(result.contains(r#"text="1 > 2""#));
        println!("Formatted with > in attribute:\n{}", result);
    }

    #[test]
    fn test_compact_xml() {
        let input = "<root>  <item>  test  </item>  </root>";
        let config = XmlFormatConfig {
            mode: FormatMode::Compact,
            ..Default::default()
        };
        let result = format_xml(input, &config).unwrap();
        assert!(!result.contains("  ")); // 不应有多个空格
        println!("Compacted:\n{}", result);
    }

    #[test]
    fn test_validate_xml_valid() {
        let result = validate_xml("<root><item></item></root>");
        assert!(result.is_valid);
    }

    #[test]
    fn test_validate_xml_valid_with_attributes() {
        let input = r#"<?xml version="1.0" encoding="UTF-8"?><root><item id="1"><name>示例</name></item></root>"#;
        let result = validate_xml(input);
        assert!(result.is_valid);
    }

    #[test]
    fn test_validate_xml_valid_with_namespace() {
        let input = r#"<ns:root xmlns:ns="http://example.com"><ns:item>test</ns:item></ns:root>"#;
        let result = validate_xml(input);
        assert!(result.is_valid);
    }

    #[test]
    fn test_validate_xml_invalid() {
        let result = validate_xml("<root><item></root>");
        assert!(!result.is_valid);
        assert!(result.error_message.is_some());
    }

    #[test]
    fn test_validate_xml_with_entities() {
        let input = "<root><item>&lt;tag&gt;</item></root>";
        let result = validate_xml(input);
        assert!(result.is_valid);
    }

    #[test]
    fn test_validate_xml_unclosed_tag() {
        let result = validate_xml("<root><item>");
        assert!(!result.is_valid);
        if let Some(line) = result.error_line {
            println!("Error at line: {}", line);
        }
    }
}
