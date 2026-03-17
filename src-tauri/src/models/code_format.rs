//! 代码格式化相关数据模型
//!
//! 定义代码格式化工具使用的数据结构

use serde::{Deserialize, Serialize};

/// 支持的编程语言
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum CodeLanguage {
    #[serde(rename = "java")]
    Java,
    #[serde(rename = "cpp")]
    Cpp,
    #[serde(rename = "rust")]
    Rust,
    #[serde(rename = "python")]
    Python,
    #[serde(rename = "sql")]
    Sql,
    #[serde(rename = "javascript")]
    JavaScript,
    #[serde(rename = "typescript")]
    TypeScript,
    #[serde(rename = "html")]
    Html,
    #[serde(rename = "css")]
    Css,
    #[serde(rename = "json")]
    Json,
    #[serde(rename = "xml")]
    Xml,
}

impl CodeLanguage {
    /// 获取语言的文件扩展名
    #[allow(dead_code)]
    pub fn extension(&self) -> &'static str {
        match self {
            CodeLanguage::Java => "java",
            CodeLanguage::Cpp => "cpp",
            CodeLanguage::Rust => "rs",
            CodeLanguage::Python => "py",
            CodeLanguage::Sql => "sql",
            CodeLanguage::JavaScript => "js",
            CodeLanguage::TypeScript => "ts",
            CodeLanguage::Html => "html",
            CodeLanguage::Css => "css",
            CodeLanguage::Json => "json",
            CodeLanguage::Xml => "xml",
        }
    }

    /// 获取语言的显示名称
    #[allow(dead_code)]
    pub fn display_name(&self) -> &'static str {
        match self {
            CodeLanguage::Java => "Java",
            CodeLanguage::Cpp => "C++",
            CodeLanguage::Rust => "Rust",
            CodeLanguage::Python => "Python",
            CodeLanguage::Sql => "SQL",
            CodeLanguage::JavaScript => "JavaScript",
            CodeLanguage::TypeScript => "TypeScript",
            CodeLanguage::Html => "HTML",
            CodeLanguage::Css => "CSS",
            CodeLanguage::Json => "JSON",
            CodeLanguage::Xml => "XML",
        }
    }
}

/// 代码格式化配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeFormatConfig {
    /// 编程语言
    pub language: CodeLanguage,

    /// 缩进空格数（默认 4）
    #[serde(default = "default_indent")]
    pub indent: u32,

    /// 使用 Tab 缩进
    #[serde(default)]
    pub use_tabs: bool,

    /// 格式化模式
    #[serde(default)]
    pub mode: FormatMode,
}

/// 默认缩进空格数
fn default_indent() -> u32 {
    4
}

/// 代码格式化模式
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum FormatMode {
    /// 标准格式化（美化）
    #[serde(rename = "pretty")]
    Pretty,
    /// 压缩格式（去除空格和换行）
    #[serde(rename = "compact")]
    Compact,
}

impl Default for FormatMode {
    fn default() -> Self {
        Self::Pretty
    }
}

impl Default for CodeFormatConfig {
    fn default() -> Self {
        Self {
            language: CodeLanguage::JavaScript,
            indent: default_indent(),
            use_tabs: false,
            mode: FormatMode::default(),
        }
    }
}

/// 代码格式化结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeFormatResult {
    /// 是否成功
    pub success: bool,

    /// 格式化后的代码字符串
    pub result: String,

    /// 错误信息（如果失败）
    pub error: Option<String>,
}

/// 代码验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeValidateResult {
    /// 是否有效的代码
    pub is_valid: bool,

    /// 错误信息（如果无效）
    pub error_message: Option<String>,

    /// 错误位置（行号，从 1 开始）
    pub error_line: Option<usize>,
}
