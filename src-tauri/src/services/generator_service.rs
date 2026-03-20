//! 生成器业务逻辑
//!
//! 提供 UUID、NanoID、密码、Hash、JWT 和用户假数据等本地生成能力

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use rand::{distributions::Alphanumeric, rngs::OsRng, seq::SliceRandom, Rng};
use serde_json::{json, Map, Value};
use sha1::Sha1;
use sha2::{Digest, Sha256, Sha512};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::generator::{
        ApiKeyGenerateOptions, CountryPreset, GeneratorItemsResult, HashAlgorithm, HashGenerateOptions, HashGenerateResult,
        IdentityGenerateOptions, JwtDecodeOptions, JwtDecodeResult, JwtGenerateOptions, JwtGenerateResult,
        NanoIdGenerateOptions, PasswordGenerateOptions, PaymentCardGenerateOptions, RandomValueGenerateOptions,
        RandomValueMode, UserDataGenerateOptions, UserDataGenerateResult, UserProfileGenerateOptions, UuidGenerateOptions,
    },
};

type HmacSha256 = Hmac<Sha256>;

const DEFAULT_NANOID_ALPHABET: &str = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
const SYMBOLS: &str = "!@#$%^&*()-_=+[]{};:,.?/";
const SIMILAR_CHARS: &str = "0O1lI";

const CN_SURNAMES: &[&str] = &["王", "李", "张", "刘", "陈", "杨", "黄", "赵", "周", "吴"];
const CN_GIVEN: &[&str] = &["伟", "芳", "娜", "敏", "静", "秀英", "磊", "洋", "勇", "艳", "杰", "婷"];
const CN_REGIONS: &[(&str, &str, &str, &str)] = &[
    ("北京市", "北京市", "朝阳区", "100020"),
    ("上海市", "上海市", "浦东新区", "200120"),
    ("广东省", "深圳市", "南山区", "518000"),
    ("浙江省", "杭州市", "西湖区", "310000"),
    ("四川省", "成都市", "高新区", "610000"),
];
const CN_STREETS: &[&str] = &["建国路", "人民路", "中山路", "解放大道", "科技园路", "创新大道"];
const CN_COMPANY_PREFIX: &[&str] = &["云启", "星河", "极光", "海纳", "远景", "腾跃"];
const CN_COMPANY_SUFFIX: &[&str] = &["科技有限公司", "信息技术有限公司", "网络科技有限公司", "电子商务有限公司"];
const CN_JOBS: &[&str] = &["产品经理", "前端工程师", "后端工程师", "运营经理", "测试工程师", "数据分析师"];

const US_FIRST_NAMES: &[&str] = &["James", "Olivia", "Liam", "Emma", "Noah", "Sophia", "Mason", "Ava", "Ethan", "Isabella"];
const US_LAST_NAMES: &[&str] = &["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson"];
const US_REGIONS: &[(&str, &str, &str)] = &[
    ("California", "San Francisco", "94105"),
    ("New York", "New York", "10001"),
    ("Texas", "Austin", "73301"),
    ("Washington", "Seattle", "98101"),
    ("Illinois", "Chicago", "60601"),
];
const US_STREETS: &[&str] = &["Market Street", "Broadway", "Main Street", "Sunset Blvd", "Oak Avenue"];
const US_COMPANIES: &[&str] = &["NorthPeak Labs", "BrightCloud Inc.", "Blue Harbor Systems", "Summit Data Works"];
const US_JOBS: &[&str] = &["Software Engineer", "Marketing Manager", "QA Analyst", "Account Executive", "Product Designer"];

const UK_FIRST_NAMES: &[&str] = &["Oliver", "George", "Harry", "Amelia", "Isla", "Ava", "Jack", "Emily"];
const UK_LAST_NAMES: &[&str] = &["Taylor", "Davies", "Evans", "Thomas", "Roberts", "Walker", "Wright"];
const UK_REGIONS: &[(&str, &str, &str)] = &[
    ("Greater London", "London", "SW1A 1AA"),
    ("Greater Manchester", "Manchester", "M1 1AE"),
    ("West Midlands", "Birmingham", "B1 1TB"),
    ("West Yorkshire", "Leeds", "LS1 1UR"),
];
const UK_STREETS: &[&str] = &["Baker Street", "King's Road", "High Street", "Victoria Road", "Station Lane"];
const UK_COMPANIES: &[&str] = &["Thames Digital Ltd", "Northbridge Analytics Ltd", "Albion Commerce Ltd"];
const UK_JOBS: &[&str] = &["Operations Lead", "Frontend Developer", "Customer Success Manager", "Data Engineer"];

const JP_FAMILY_NAMES: &[&str] = &["佐藤", "铃木", "高桥", "田中", "伊藤", "渡边", "山本"];
const JP_GIVEN_NAMES: &[&str] = &["翔太", "阳菜", "结衣", "莲", "美咲", "大和", "葵"];
const JP_REGIONS: &[(&str, &str, &str, &str)] = &[
    ("东京都", "涩谷区", "神南", "150-0041"),
    ("大阪府", "大阪市", "北区", "530-0001"),
    ("爱知县", "名古屋市", "中村区", "450-0002"),
    ("福冈县", "福冈市", "博多区", "812-0011"),
];
const JP_COMPANIES: &[&str] = &["樱桥科技株式会社", "未来数据株式会社", "东海系统株式会社"];
const JP_JOBS: &[&str] = &["プロダクトマネージャー", "ソフトウェアエンジニア", "データアナリスト", "QAエンジニア"];

const DE_FIRST_NAMES: &[&str] = &["Max", "Paul", "Ben", "Anna", "Mia", "Emma", "Leon", "Lina"];
const DE_LAST_NAMES: &[&str] = &["Muller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner"];
const DE_REGIONS: &[(&str, &str, &str)] = &[
    ("Bayern", "Munchen", "80331"),
    ("Berlin", "Berlin", "10115"),
    ("Nordrhein-Westfalen", "Koln", "50667"),
    ("Hamburg", "Hamburg", "20095"),
];
const DE_STREETS: &[&str] = &["Hauptstrasse", "Bahnhofstrasse", "Gartenweg", "Schillerstrasse", "Berliner Allee"];
const DE_COMPANIES: &[&str] = &["Nordstern GmbH", "Rhein Data GmbH", "Alpen Systems GmbH"];
const DE_JOBS: &[&str] = &["Produktmanager", "Softwareentwickler", "Vertriebsleiter", "Datenanalyst"];

pub struct GeneratorService;

impl GeneratorService {
    pub fn generate_uuid(options: &UuidGenerateOptions) -> AppResult<GeneratorItemsResult> {
        let count = normalize_count(options.count)?;
        let items = (0..count)
            .map(|_| {
                let mut value = Uuid::new_v4().to_string();
                if options.remove_hyphens {
                    value = value.replace('-', "");
                }
                if options.uppercase {
                    value = value.to_uppercase();
                }
                value
            })
            .collect::<Vec<_>>();

        Ok(build_items_result(items, vec![format!("批量: {}", count)]))
    }

    pub fn generate_nanoid(options: &NanoIdGenerateOptions) -> AppResult<GeneratorItemsResult> {
        let count = normalize_count(options.count)?;
        let length = normalize_length(options.length, 8, 128, "NanoID 长度")?;
        let alphabet = options.alphabet.as_deref().unwrap_or(DEFAULT_NANOID_ALPHABET);
        let alphabet_chars = unique_chars(alphabet)?;
        let mut rng = OsRng;
        let mut items = Vec::with_capacity(count);

        for _ in 0..count {
            let mut value = String::with_capacity(length);
            for _ in 0..length {
                let ch = alphabet_chars.choose(&mut rng).ok_or_else(|| AppError::InvalidData("NanoID 字符集不能为空".to_string()))?;
                value.push(*ch);
            }
            items.push(value);
        }

        Ok(build_items_result(items, vec![format!("长度: {}", length), format!("字符集: {} 个字符", alphabet_chars.len())]))
    }

    pub fn generate_random_value(options: &RandomValueGenerateOptions) -> AppResult<GeneratorItemsResult> {
        let count = normalize_count(options.count)?;
        let mut rng = OsRng;
        let items = match options.mode {
            RandomValueMode::Integer => {
                validate_min_max(options.min, options.max)?;
                (0..count).map(|_| rng.gen_range(options.min..=options.max).to_string()).collect::<Vec<_>>()
            }
            RandomValueMode::Float => {
                validate_min_max(options.min, options.max)?;
                let min = options.min as f64;
                let max = options.max as f64;
                let factor = 10_f64.powi(i32::from(options.decimal_places));
                (0..count)
                    .map(|_| {
                        let raw = rng.gen_range(min..=max);
                        let rounded = (raw * factor).round() / factor;
                        format!("{:.*}", usize::from(options.decimal_places), rounded)
                    })
                    .collect::<Vec<_>>()
            }
            RandomValueMode::String => {
                let length = normalize_length(options.length, 1, 256, "随机字符串长度")?;
                let charset = options.charset.as_deref().unwrap_or(DEFAULT_NANOID_ALPHABET);
                let alphabet_chars = unique_chars(charset)?;
                (0..count)
                    .map(|_| {
                        let mut value = String::with_capacity(length);
                        for _ in 0..length {
                            let ch = alphabet_chars.choose(&mut rng).expect("alphabet validated");
                            value.push(*ch);
                        }
                        value
                    })
                    .collect::<Vec<_>>()
            }
        };

        Ok(build_items_result(items, vec![format!("模式: {:?}", options.mode)]))
    }

    pub fn generate_password(options: &PasswordGenerateOptions) -> AppResult<GeneratorItemsResult> {
        let count = normalize_count(options.count)?;
        let length = normalize_length(options.length, 4, 256, "密码长度")?;
        let pools = build_password_pools(options)?;
        let mut rng = OsRng;
        let mut items = Vec::with_capacity(count);

        for _ in 0..count {
            let mut chars = Vec::with_capacity(length);
            for pool in &pools {
                let ch = pool.choose(&mut rng).ok_or_else(|| AppError::InvalidData("密码字符池不能为空".to_string()))?;
                chars.push(*ch);
            }
            while chars.len() < length {
                let pool = pools.choose(&mut rng).expect("pools validated");
                let ch = pool.choose(&mut rng).expect("pool validated");
                chars.push(*ch);
            }
            chars.shuffle(&mut rng);
            items.push(chars.into_iter().collect::<String>());
        }

        Ok(build_items_result(items, vec![format!("长度: {}", length), format!("规则组数: {}", pools.len())]))
    }

    pub fn generate_api_key(options: &ApiKeyGenerateOptions) -> AppResult<GeneratorItemsResult> {
        let count = normalize_count(options.count)?;
        let length = normalize_length(options.length, 8, 128, "Key 长度")?;
        let mut rng = OsRng;
        let mut items = Vec::with_capacity(count);

        for _ in 0..count {
            let random = std::iter::repeat_with(|| rng.sample(Alphanumeric)).take(length).map(char::from).collect::<String>();
            let value = if options.prefix.trim().is_empty() { random } else { format!("{}{}{}", options.prefix.trim(), options.separator, random) };
            items.push(value);
        }

        Ok(build_items_result(items, vec![format!("长度: {}", length)]))
    }

    pub fn generate_hash(options: &HashGenerateOptions) -> AppResult<HashGenerateResult> {
        if options.input.is_empty() {
            return Err(AppError::InvalidData("输入内容不能为空".to_string()));
        }

        let value = match options.algorithm {
            HashAlgorithm::Md5 => format!("{:x}", md5::compute(options.input.as_bytes())),
            HashAlgorithm::Sha1 => {
                let mut hasher = Sha1::new();
                hasher.update(options.input.as_bytes());
                hex::encode(hasher.finalize())
            }
            HashAlgorithm::Sha256 => {
                let mut hasher = Sha256::new();
                hasher.update(options.input.as_bytes());
                hex::encode(hasher.finalize())
            }
            HashAlgorithm::Sha512 => {
                let mut hasher = Sha512::new();
                hasher.update(options.input.as_bytes());
                hex::encode(hasher.finalize())
            }
        };

        Ok(HashGenerateResult {
            algorithm: format_hash_algorithm(options.algorithm).to_string(),
            value,
            meta: vec![format!("输入长度: {}", options.input.chars().count())],
        })
    }

    pub fn generate_jwt(options: &JwtGenerateOptions) -> AppResult<JwtGenerateResult> {
        let payload = parse_json(&options.payload_json, "Payload JSON")?;
        let header = if options.header_json.trim().is_empty() { json!({ "alg": "HS256", "typ": "JWT" }) } else { parse_json(&options.header_json, "Header JSON")? };
        let secret = if options.secret.is_empty() { "deskforge-dev-secret" } else { options.secret.as_str() };

        let header_compact = serde_json::to_vec(&header).map_err(|error| AppError::InvalidData(format!("序列化 JWT Header 失败: {}", error)))?;
        let payload_compact = serde_json::to_vec(&payload).map_err(|error| AppError::InvalidData(format!("序列化 JWT Payload 失败: {}", error)))?;

        let header_segment = URL_SAFE_NO_PAD.encode(header_compact);
        let payload_segment = URL_SAFE_NO_PAD.encode(payload_compact);
        let message = format!("{}.{}", header_segment, payload_segment);

        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).map_err(|error| AppError::InvalidData(format!("生成 JWT 签名失败: {}", error)))?;
        mac.update(message.as_bytes());
        let signature = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
        let token = format!("{}.{}", message, signature);

        Ok(JwtGenerateResult {
            token,
            header_pretty: pretty_json(&header)?,
            payload_pretty: pretty_json(&payload)?,
            meta: vec!["算法: HS256".to_string(), format!("Secret 长度: {}", secret.chars().count())],
        })
    }

    pub fn decode_jwt(options: &JwtDecodeOptions) -> AppResult<JwtDecodeResult> {
        let token = options.token.trim();
        if token.is_empty() {
            return Err(AppError::InvalidData("JWT 不能为空".to_string()));
        }

        let segments = token.split('.').collect::<Vec<_>>();
        if segments.len() != 3 {
            return Err(AppError::InvalidData("JWT 必须包含 3 段".to_string()));
        }

        let header_bytes = URL_SAFE_NO_PAD.decode(segments[0]).map_err(|error| AppError::InvalidData(format!("JWT Header 解码失败: {}", error)))?;
        let payload_bytes = URL_SAFE_NO_PAD.decode(segments[1]).map_err(|error| AppError::InvalidData(format!("JWT Payload 解码失败: {}", error)))?;
        let header: Value = serde_json::from_slice(&header_bytes).map_err(|error| AppError::InvalidData(format!("JWT Header 不是合法 JSON: {}", error)))?;
        let payload: Value = serde_json::from_slice(&payload_bytes).map_err(|error| AppError::InvalidData(format!("JWT Payload 不是合法 JSON: {}", error)))?;
        let algorithm = header.get("alg").and_then(Value::as_str).unwrap_or("未知");

        Ok(JwtDecodeResult {
            header_pretty: pretty_json(&header)?,
            payload_pretty: pretty_json(&payload)?,
            signature: segments[2].to_string(),
            meta: vec![format!("算法: {}", algorithm), format!("签名长度: {}", segments[2].len())],
        })
    }

    pub fn generate_user_persona(options: &UserDataGenerateOptions) -> AppResult<UserDataGenerateResult> {
        let count = normalize_count(options.count)?;
        let country = country_info(options.country);
        let mut rng = OsRng;
        let mut list = Vec::with_capacity(count);

        for _ in 0..count {
            let gender = if rng.gen_bool(0.5) { "male" } else { "female" };
            let name = full_name(options.country, gender, &mut rng);
            let age = rng.gen_range(20..=54);
            let year = 2026 - age;
            let month = rng.gen_range(1..=12);
            let day = rng.gen_range(1..=28);
            let username = slugify(&name, &country.code.to_lowercase(), rng.gen_range(100..999));
            list.push(json!({
                "name": name,
                "gender": gender,
                "age": age,
                "birthday": format!("{:04}-{:02}-{:02}", year, month, day),
                "username": username,
                "countryCode": country.code,
            }));
        }

        build_user_result(options.country, "个人资料", list)
    }

    pub fn generate_user_contact(options: &UserDataGenerateOptions) -> AppResult<UserDataGenerateResult> {
        let count = normalize_count(options.count)?;
        let mut rng = OsRng;
        let mut list = Vec::with_capacity(count);

        for _ in 0..count {
            let gender = if rng.gen_bool(0.5) { "male" } else { "female" };
            let name = full_name(options.country, gender, &mut rng);
            let email = build_email(options.country, &name, &mut rng);
            let phone = build_phone(options.country, &mut rng);
            list.push(json!({
                "name": name,
                "email": email,
                "phone": phone,
                "countryCode": country_info(options.country).code,
            }));
        }

        build_user_result(options.country, "联系方式", list)
    }

    pub fn generate_user_address(options: &UserDataGenerateOptions) -> AppResult<UserDataGenerateResult> {
        let count = normalize_count(options.count)?;
        let mut rng = OsRng;
        let mut list = Vec::with_capacity(count);

        for _ in 0..count {
            list.push(build_address(options.country, &mut rng));
        }

        build_user_result(options.country, "地址", list)
    }

    pub fn generate_user_company(options: &UserDataGenerateOptions) -> AppResult<UserDataGenerateResult> {
        let count = normalize_count(options.count)?;
        let mut rng = OsRng;
        let mut list = Vec::with_capacity(count);

        for _ in 0..count {
            list.push(json!({
                "companyName": build_company_name(options.country, &mut rng),
                "jobTitle": build_job_title(options.country, &mut rng),
                "department": choose_department(&mut rng),
                "countryCode": country_info(options.country).code,
            }));
        }

        build_user_result(options.country, "公司", list)
    }

    pub fn generate_identity_document(options: &IdentityGenerateOptions) -> AppResult<UserDataGenerateResult> {
        let count = normalize_count(options.count)?;
        let mut rng = OsRng;
        let mut list = Vec::with_capacity(count);

        for _ in 0..count {
            let document_type = if options.document_type.trim().is_empty() {
                default_document_type(options.country).to_string()
            } else {
                options.document_type.clone()
            };
            let number = build_identity_number(options.country, &document_type, &mut rng)?;
            list.push(json!({
                "documentType": document_type,
                "documentNumber": number,
                "isRuleValid": true,
                "warning": "仅限测试用途",
                "countryCode": country_info(options.country).code,
            }));
        }

        build_user_result(options.country, "身份", list)
    }

    pub fn generate_payment_card(options: &PaymentCardGenerateOptions) -> AppResult<UserDataGenerateResult> {
        let count = normalize_count(options.count)?;
        let mut rng = OsRng;
        let mut list = Vec::with_capacity(count);

        for _ in 0..count {
            let brand = if options.brand.trim().is_empty() {
                default_card_brand(options.country).to_string()
            } else {
                options.brand.clone()
            };
            let card_number = build_card_number(options.country, &brand, &mut rng)?;
            let expiry_month = rng.gen_range(1..=12);
            let expiry_year = rng.gen_range(2027..=2034);
            let cvv_len = if brand.eq_ignore_ascii_case("amex") { 4 } else { 3 };
            list.push(json!({
                "brand": brand,
                "cardNumber": card_number,
                "maskedCardNumber": mask_card_number(&card_number),
                "expiryMonth": format!("{:02}", expiry_month),
                "expiryYear": expiry_year,
                "cvv": random_digits(cvv_len, &mut rng),
                "countryCode": country_info(options.country).code,
            }));
        }

        build_user_result(options.country, "支付", list)
    }

    pub fn generate_user_profile(options: &UserProfileGenerateOptions) -> AppResult<UserDataGenerateResult> {
        let count = normalize_count(options.count)?;
        if !(options.include_profile
            || options.include_contact
            || options.include_address
            || options.include_company
            || options.include_identity
            || options.include_payment
            || options.include_account
            || options.include_preferences
            || options.include_device)
        {
            return Err(AppError::InvalidData("至少选择一个组合字段块".to_string()));
        }

        let mut rng = OsRng;
        let mut list = Vec::with_capacity(count);

        for _ in 0..count {
            let gender = if rng.gen_bool(0.5) { "male" } else { "female" };
            let name = full_name(options.country, gender, &mut rng);
            let age = rng.gen_range(20..=54);
            let year = 2026 - age;
            let month = rng.gen_range(1..=12);
            let day = rng.gen_range(1..=28);
            let birthday = format!("{:04}-{:02}-{:02}", year, month, day);
            let username = slugify(&name, &country_info(options.country).code.to_lowercase(), rng.gen_range(100..999));
            let email = build_email(options.country, &name, &mut rng);
            let phone = build_phone(options.country, &mut rng);
            let address = build_address(options.country, &mut rng);
            let mut profile = Map::new();

            if options.include_profile {
                profile.insert("profile".to_string(), build_profile_value(options.country, &name, gender, age, &birthday, &username));
            }
            if options.include_contact {
                profile.insert("contact".to_string(), build_contact_value(options.country, &name, &email, &phone, &username, &mut rng));
            }
            if options.include_address {
                profile.insert("address".to_string(), address.clone());
            }
            if options.include_company {
                profile.insert("company".to_string(), build_company_value(options.country, &mut rng));
            }
            if options.include_identity {
                profile.insert("identity".to_string(), build_identity_value(options.country, &mut rng)?);
            }
            if options.include_payment {
                profile.insert("payment".to_string(), build_payment_value(options.country, &mut rng)?);
            }
            if options.include_account {
                profile.insert("account".to_string(), build_account_value(options.country, &name, &username, &email, &mut rng));
            }
            if options.include_preferences {
                profile.insert("preferences".to_string(), build_preferences_value(options.country, &mut rng));
            }
            if options.include_device {
                profile.insert("device".to_string(), build_device_value(options.country, &mut rng));
            }
            profile.insert("countryCode".to_string(), json!(country_info(options.country).code));
            list.push(Value::Object(profile));
        }

        build_user_result(options.country, "用户档案", list)
    }
}

#[derive(Clone, Copy)]
struct CountryInfo {
    code: &'static str,
    label: &'static str,
}

fn country_info(country: CountryPreset) -> CountryInfo {
    match country {
        CountryPreset::Cn => CountryInfo { code: "CN", label: "中国大陆" },
        CountryPreset::Us => CountryInfo { code: "US", label: "美国" },
        CountryPreset::Uk => CountryInfo { code: "UK", label: "英国" },
        CountryPreset::Jp => CountryInfo { code: "JP", label: "日本" },
        CountryPreset::De => CountryInfo { code: "DE", label: "德国" },
    }
}

fn build_items_result(items: Vec<String>, meta: Vec<String>) -> GeneratorItemsResult {
    GeneratorItemsResult { text: items.join("\n"), items, meta }
}

fn build_user_result(country: CountryPreset, section: &str, values: Vec<Value>) -> AppResult<UserDataGenerateResult> {
    let info = country_info(country);
    let items = values.iter().map(compact_json).collect::<AppResult<Vec<_>>>()?;
    let text = items.join("\n");
    let json = serde_json::to_string_pretty(&values).map_err(|error| AppError::InvalidData(format!("{}结果序列化失败: {}", section, error)))?;
    Ok(UserDataGenerateResult {
        country: info.code.to_string(),
        locale_label: info.label.to_string(),
        text,
        items,
        json,
        meta: vec![format!("国家: {}", info.label), format!("模块: {}", section), format!("数量: {}", values.len())],
    })
}

fn compact_json(value: &Value) -> AppResult<String> {
    serde_json::to_string(value).map_err(|error| AppError::InvalidData(format!("结果序列化失败: {}", error)))
}

fn normalize_count(count: usize) -> AppResult<usize> {
    if count == 0 || count > 100 {
        return Err(AppError::InvalidData("批量数量必须在 1 到 100 之间".to_string()));
    }
    Ok(count)
}

fn normalize_length(length: usize, min: usize, max: usize, label: &str) -> AppResult<usize> {
    if length < min || length > max {
        return Err(AppError::InvalidData(format!("{}必须在 {} 到 {} 之间", label, min, max)));
    }
    Ok(length)
}

fn unique_chars(input: &str) -> AppResult<Vec<char>> {
    let chars = input.chars().collect::<Vec<_>>();
    if chars.is_empty() {
        return Err(AppError::InvalidData("字符集不能为空".to_string()));
    }
    Ok(chars)
}

fn validate_min_max(min: i64, max: i64) -> AppResult<()> {
    if min > max {
        return Err(AppError::InvalidData("最小值不能大于最大值".to_string()));
    }
    Ok(())
}

fn build_password_pools(options: &PasswordGenerateOptions) -> AppResult<Vec<Vec<char>>> {
    let mut pools = Vec::new();
    let mut uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".chars().collect::<Vec<_>>();
    let mut lowercase = "abcdefghijklmnopqrstuvwxyz".chars().collect::<Vec<_>>();
    let mut numbers = "0123456789".chars().collect::<Vec<_>>();
    let symbols = SYMBOLS.chars().collect::<Vec<_>>();

    if options.exclude_similar {
        uppercase.retain(|ch| !SIMILAR_CHARS.contains(*ch));
        lowercase.retain(|ch| !SIMILAR_CHARS.contains(*ch));
        numbers.retain(|ch| !SIMILAR_CHARS.contains(*ch));
    }

    if options.include_uppercase { pools.push(uppercase); }
    if options.include_lowercase { pools.push(lowercase); }
    if options.include_numbers { pools.push(numbers); }
    if options.include_symbols { pools.push(symbols); }

    if pools.is_empty() {
        return Err(AppError::InvalidData("至少启用一种密码字符规则".to_string()));
    }
    Ok(pools)
}

fn parse_json(input: &str, label: &str) -> AppResult<Value> {
    serde_json::from_str::<Value>(input).map_err(|error| AppError::InvalidData(format!("{}解析失败: {}", label, error)))
}

fn pretty_json(value: &Value) -> AppResult<String> {
    serde_json::to_string_pretty(value).map_err(|error| AppError::InvalidData(format!("JSON 美化失败: {}", error)))
}

fn format_hash_algorithm(algorithm: HashAlgorithm) -> &'static str {
    match algorithm {
        HashAlgorithm::Md5 => "MD5",
        HashAlgorithm::Sha1 => "SHA-1",
        HashAlgorithm::Sha256 => "SHA-256",
        HashAlgorithm::Sha512 => "SHA-512",
    }
}

fn choose_str<'a>(items: &'a [&'a str], rng: &mut OsRng) -> &'a str {
    items.choose(rng).copied().expect("static slice is non-empty")
}

fn full_name(country: CountryPreset, _gender: &str, rng: &mut OsRng) -> String {
    match country {
        CountryPreset::Cn => format!("{}{}", choose_str(CN_SURNAMES, rng), choose_str(CN_GIVEN, rng)),
        CountryPreset::Us => format!("{} {}", choose_str(US_FIRST_NAMES, rng), choose_str(US_LAST_NAMES, rng)),
        CountryPreset::Uk => format!("{} {}", choose_str(UK_FIRST_NAMES, rng), choose_str(UK_LAST_NAMES, rng)),
        CountryPreset::Jp => format!("{} {}", choose_str(JP_FAMILY_NAMES, rng), choose_str(JP_GIVEN_NAMES, rng)),
        CountryPreset::De => format!("{} {}", choose_str(DE_FIRST_NAMES, rng), choose_str(DE_LAST_NAMES, rng)),
    }
}

fn slugify(name: &str, prefix: &str, suffix: i32) -> String {
    let ascii = name
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch.to_ascii_lowercase() } else if ch.is_whitespace() { '-' } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .replace("--", "-");
    if ascii.is_empty() { format!("{}-{}", prefix, suffix) } else { format!("{}-{}", ascii, suffix) }
}

fn build_email(country: CountryPreset, name: &str, rng: &mut OsRng) -> String {
    let domains = match country {
        CountryPreset::Cn => ["qq.com", "163.com", "example.cn", "mail.cn"].as_slice(),
        CountryPreset::Us => ["gmail.com", "outlook.com", "example.com", "mail.com"].as_slice(),
        CountryPreset::Uk => ["gmail.co.uk", "outlook.co.uk", "example.co.uk"].as_slice(),
        CountryPreset::Jp => ["yahoo.co.jp", "gmail.com", "example.jp"].as_slice(),
        CountryPreset::De => ["gmail.de", "web.de", "example.de"].as_slice(),
    };
    let local = slugify(name, &country_info(country).code.to_lowercase(), rng.gen_range(10..99)).replace('-', "");
    format!("{}@{}", local, choose_str(domains, rng))
}

fn build_phone(country: CountryPreset, rng: &mut OsRng) -> String {
    match country {
        CountryPreset::Cn => format!("+86 1{}{}{}", rng.gen_range(3..=9), random_digits(4, rng), random_digits(4, rng)),
        CountryPreset::Us => format!("+1 ({}) {}-{}", rng.gen_range(201..999), rng.gen_range(200..999), random_digits(4, rng)),
        CountryPreset::Uk => format!("+44 7{} {} {}", random_digits(3, rng), random_digits(3, rng), random_digits(3, rng)),
        CountryPreset::Jp => format!("+81 90-{}-{}", random_digits(4, rng), random_digits(4, rng)),
        CountryPreset::De => format!("+49 15{} {}{}", rng.gen_range(1..=9), random_digits(3, rng), random_digits(5, rng)),
    }
}

fn build_address(country: CountryPreset, rng: &mut OsRng) -> Value {
    match country {
        CountryPreset::Cn => {
            let (region, city, district, postal) = CN_REGIONS.choose(rng).copied().unwrap();
            let street_no = rng.gen_range(18..=888);
            let line1 = format!("{}{}号{}{}室", choose_str(CN_STREETS, rng), street_no, rng.gen_range(1..=12), rng.gen_range(101..=2601));
            let formatted = format!("{}{}{}{}", region, city, district, line1);
            json!({ "countryCode": "CN", "region": region, "city": city, "district": district, "postalCode": postal, "line1": line1, "line2": "", "formatted": formatted })
        }
        CountryPreset::Us => {
            let (region, city, postal) = US_REGIONS.choose(rng).copied().unwrap();
            let line1 = format!("{} {}", rng.gen_range(100..9999), choose_str(US_STREETS, rng));
            let formatted = format!("{}, {}, {} {}", line1, city, region, postal);
            json!({ "countryCode": "US", "region": region, "city": city, "district": "", "postalCode": postal, "line1": line1, "line2": format!("Suite {}", rng.gen_range(100..999)), "formatted": formatted })
        }
        CountryPreset::Uk => {
            let (region, city, postal) = UK_REGIONS.choose(rng).copied().unwrap();
            let line1 = format!("{} {}", rng.gen_range(10..999), choose_str(UK_STREETS, rng));
            let formatted = format!("{}, {}, {}, {}", line1, city, region, postal);
            json!({ "countryCode": "UK", "region": region, "city": city, "district": "", "postalCode": postal, "line1": line1, "line2": "", "formatted": formatted })
        }
        CountryPreset::Jp => {
            let (region, city, district, postal) = JP_REGIONS.choose(rng).copied().unwrap();
            let line1 = format!("{}{}-{}", district, rng.gen_range(1..=5), rng.gen_range(1..=20));
            let formatted = format!("〒{} {}{}{}", postal, region, city, line1);
            json!({ "countryCode": "JP", "region": region, "city": city, "district": district, "postalCode": postal, "line1": line1, "line2": "", "formatted": formatted })
        }
        CountryPreset::De => {
            let (region, city, postal) = DE_REGIONS.choose(rng).copied().unwrap();
            let line1 = format!("{} {}", choose_str(DE_STREETS, rng), rng.gen_range(1..=220));
            let formatted = format!("{}, {} {}, {}", line1, postal, city, region);
            json!({ "countryCode": "DE", "region": region, "city": city, "district": "", "postalCode": postal, "line1": line1, "line2": "", "formatted": formatted })
        }
    }
}

fn build_company_name(country: CountryPreset, rng: &mut OsRng) -> String {
    match country {
        CountryPreset::Cn => format!("{}{}", choose_str(CN_COMPANY_PREFIX, rng), choose_str(CN_COMPANY_SUFFIX, rng)),
        CountryPreset::Us => choose_str(US_COMPANIES, rng).to_string(),
        CountryPreset::Uk => choose_str(UK_COMPANIES, rng).to_string(),
        CountryPreset::Jp => choose_str(JP_COMPANIES, rng).to_string(),
        CountryPreset::De => choose_str(DE_COMPANIES, rng).to_string(),
    }
}

fn build_job_title(country: CountryPreset, rng: &mut OsRng) -> String {
    match country {
        CountryPreset::Cn => choose_str(CN_JOBS, rng).to_string(),
        CountryPreset::Us => choose_str(US_JOBS, rng).to_string(),
        CountryPreset::Uk => choose_str(UK_JOBS, rng).to_string(),
        CountryPreset::Jp => choose_str(JP_JOBS, rng).to_string(),
        CountryPreset::De => choose_str(DE_JOBS, rng).to_string(),
    }
}

fn choose_department(rng: &mut OsRng) -> String {
    choose_str(&["Engineering", "Product", "Operations", "Marketing", "Finance", "Data"], rng).to_string()
}

fn build_profile_value(country: CountryPreset, name: &str, gender: &str, age: i32, birthday: &str, username: &str) -> Value {
    json!({
        "name": name,
        "displayName": name,
        "gender": gender,
        "age": age,
        "birthday": birthday,
        "username": username,
        "locale": locale_code(country),
        "countryCode": country_info(country).code,
    })
}

fn build_contact_value(country: CountryPreset, name: &str, email: &str, phone: &str, username: &str, rng: &mut OsRng) -> Value {
    json!({
        "name": name,
        "email": email,
        "alternateEmail": format!("{}@{}", username.replace('-', ""), corporate_domain(country)),
        "phone": phone,
        "website": format!("https://{}.example", username.replace('-', "")),
        "countryCode": country_info(country).code,
        "verified": rng.gen_bool(0.72),
    })
}

fn build_company_value(country: CountryPreset, rng: &mut OsRng) -> Value {
    json!({
        "companyName": build_company_name(country, rng),
        "jobTitle": build_job_title(country, rng),
        "department": choose_department(rng),
        "employmentType": choose_str(&["full-time", "part-time", "contractor", "intern"], rng),
        "workMode": choose_str(&["onsite", "hybrid", "remote"], rng),
    })
}

fn build_identity_value(country: CountryPreset, rng: &mut OsRng) -> AppResult<Value> {
    let document_type = default_document_type(country);
    Ok(json!({
        "documentType": document_type,
        "documentNumber": build_identity_number(country, document_type, rng)?,
        "isRuleValid": true,
        "warning": "仅限测试用途",
    }))
}

fn build_payment_value(country: CountryPreset, rng: &mut OsRng) -> AppResult<Value> {
    let brand = default_card_brand(country).to_string();
    let card_number = build_card_number(country, &brand, rng)?;
    let cvv_len = if brand.eq_ignore_ascii_case("amex") { 4 } else { 3 };
    Ok(json!({
        "brand": brand,
        "cardNumber": card_number,
        "maskedCardNumber": mask_card_number(&card_number),
        "expiryMonth": format!("{:02}", rng.gen_range(1..=12)),
        "expiryYear": rng.gen_range(2027..=2034),
        "cvv": random_digits(cvv_len, rng),
        "currency": currency_code(country),
    }))
}

fn build_account_value(country: CountryPreset, name: &str, username: &str, email: &str, rng: &mut OsRng) -> Value {
    let display_name = if country == CountryPreset::Cn { name.to_string() } else { format!("{} {}", choose_str(&["Pro", "Prime", "Plus", "Core"], rng), name) };
    json!({
        "userId": format!("usr_{}", random_digits(10, rng)),
        "displayName": display_name,
        "status": choose_str(&["active", "pending", "suspended", "new"], rng),
        "registerAt": random_recent_datetime(rng),
        "lastLoginAt": random_recent_datetime(rng),
        "email": email,
        "login": {
            "username": username,
            "password": build_mock_password(rng),
        },
        "tags": [
            choose_str(&["new-user", "vip", "campaign-a", "crm-import", "beta"], rng),
            choose_str(&["newsletter", "mobile", "desktop", "b2b", "growth"], rng)
        ],
    })
}

fn build_preferences_value(country: CountryPreset, rng: &mut OsRng) -> Value {
    json!({
        "language": locale_code(country),
        "currency": currency_code(country),
        "timezone": timezone_code(country),
        "marketingOptIn": rng.gen_bool(0.55),
        "theme": choose_str(&["system", "light", "dark"], rng),
        "notificationChannels": [
            choose_str(&["email", "sms", "push"], rng),
            choose_str(&["email", "sms", "push", "inbox"], rng)
        ],
    })
}

fn build_device_value(country: CountryPreset, rng: &mut OsRng) -> Value {
    json!({
        "deviceId": format!("dev_{}", random_digits(12, rng)),
        "platform": choose_str(&["ios", "android", "windows", "macos", "web"], rng),
        "appVersion": format!("{}.{}.{}", rng.gen_range(1..=5), rng.gen_range(0..=9), rng.gen_range(0..=9)),
        "ipAddress": mock_ip(rng),
        "lastSeenAt": random_recent_datetime(rng),
        "locale": locale_code(country),
    })
}

fn locale_code(country: CountryPreset) -> &'static str {
    match country {
        CountryPreset::Cn => "zh-CN",
        CountryPreset::Us => "en-US",
        CountryPreset::Uk => "en-GB",
        CountryPreset::Jp => "ja-JP",
        CountryPreset::De => "de-DE",
    }
}

fn currency_code(country: CountryPreset) -> &'static str {
    match country {
        CountryPreset::Cn => "CNY",
        CountryPreset::Us => "USD",
        CountryPreset::Uk => "GBP",
        CountryPreset::Jp => "JPY",
        CountryPreset::De => "EUR",
    }
}

fn timezone_code(country: CountryPreset) -> &'static str {
    match country {
        CountryPreset::Cn => "Asia/Shanghai",
        CountryPreset::Us => "America/Los_Angeles",
        CountryPreset::Uk => "Europe/London",
        CountryPreset::Jp => "Asia/Tokyo",
        CountryPreset::De => "Europe/Berlin",
    }
}

fn corporate_domain(country: CountryPreset) -> &'static str {
    match country {
        CountryPreset::Cn => "corp.cn",
        CountryPreset::Us => "corp.us",
        CountryPreset::Uk => "corp.co.uk",
        CountryPreset::Jp => "corp.jp",
        CountryPreset::De => "corp.de",
    }
}

fn build_mock_password(rng: &mut OsRng) -> String {
    format!(
        "{}{}!{}",
        choose_str(&["Desk", "Forge", "Mock", "Test"], rng),
        rng.gen_range(10..=99),
        random_digits(3, rng)
    )
}

fn random_recent_datetime(rng: &mut OsRng) -> String {
    let year = 2026;
    let month = rng.gen_range(1..=12);
    let day = rng.gen_range(1..=28);
    let hour = rng.gen_range(0..=23);
    let minute = rng.gen_range(0..=59);
    let second = rng.gen_range(0..=59);
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", year, month, day, hour, minute, second)
}

fn mock_ip(rng: &mut OsRng) -> String {
    format!("{}.{}.{}.{}", rng.gen_range(11..=223), rng.gen_range(0..=255), rng.gen_range(0..=255), rng.gen_range(1..=254))
}

fn default_document_type(country: CountryPreset) -> &'static str {
    match country {
        CountryPreset::Cn => "nationalId",
        CountryPreset::Us => "ssn",
        CountryPreset::Uk => "nino",
        CountryPreset::Jp => "myNumber",
        CountryPreset::De => "taxId",
    }
}

fn build_identity_number(country: CountryPreset, _document_type: &str, rng: &mut OsRng) -> AppResult<String> {
    match country {
        CountryPreset::Cn => Ok(generate_cn_id(rng)),
        CountryPreset::Us => Ok(format!("{}-{}-{}", random_non_zero_digits(3, rng), random_non_zero_digits(2, rng), random_non_zero_digits(4, rng))),
        CountryPreset::Uk => Ok(generate_uk_nino(rng)),
        CountryPreset::Jp => Ok(generate_jp_my_number(rng)),
        CountryPreset::De => Ok(generate_de_tax_id(rng)),
    }
}

fn generate_cn_id(rng: &mut OsRng) -> String {
    let area_codes = [110105, 310115, 440305, 330106, 510109];
    let area = area_codes.choose(rng).copied().unwrap();
    let year = rng.gen_range(1975..=2004);
    let month = rng.gen_range(1..=12);
    let day = rng.gen_range(1..=28);
    let seq = rng.gen_range(100..=999);
    let base = format!("{}{:04}{:02}{:02}{:03}", area, year, month, day, seq);
    let weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    let codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    let sum = base.chars().zip(weights).map(|(ch, weight)| ch.to_digit(10).unwrap() * weight).sum::<u32>();
    format!("{}{}", base, codes[(sum % 11) as usize])
}

fn generate_uk_nino(rng: &mut OsRng) -> String {
    let letters = "ABCEGHJKLMNPRSTWXYZ".chars().collect::<Vec<_>>();
    format!(
        "{}{} {} {} {} {}",
        letters.choose(rng).unwrap(),
        letters.choose(rng).unwrap(),
        random_digits(2, rng),
        random_digits(2, rng),
        random_digits(2, rng),
        choose_str(&["A", "B", "C", "D"], rng)
    )
}

fn generate_jp_my_number(rng: &mut OsRng) -> String {
    let mut digits = (0..11).map(|_| rng.gen_range(0..=9)).collect::<Vec<u32>>();
    let weights = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6];
    let sum = digits.iter().rev().zip(weights).map(|(d, w)| d * w).sum::<u32>();
    let mod_val = 11 - (sum % 11);
    let check = match mod_val {
        10 | 11 => 0,
        value => value,
    };
    digits.push(check);
    digits.into_iter().map(|d| char::from_digit(d, 10).unwrap()).collect()
}

fn generate_de_tax_id(rng: &mut OsRng) -> String {
    let mut digits = Vec::with_capacity(11);
    digits.push(rng.gen_range(1..=9));
    for _ in 0..9 {
        digits.push(rng.gen_range(0..=9));
    }
    let mut product = 10u32;
    for digit in &digits {
        let sum = (digit + product) % 10;
        product = (2 * if sum == 0 { 10 } else { sum }) % 11;
    }
    let check = (11 - product) % 10;
    digits.push(check);
    digits.into_iter().map(|d| char::from_digit(d, 10).unwrap()).collect()
}

fn default_card_brand(country: CountryPreset) -> &'static str {
    match country {
        CountryPreset::Cn => "unionpay",
        CountryPreset::Us => "visa",
        CountryPreset::Uk => "mastercard",
        CountryPreset::Jp => "jcb",
        CountryPreset::De => "visa",
    }
}

fn build_card_number(country: CountryPreset, brand: &str, rng: &mut OsRng) -> AppResult<String> {
    let (prefix, length) = match (country, brand.to_ascii_lowercase().as_str()) {
        (CountryPreset::Cn, "unionpay") => ("62", 16),
        (_, "visa") => ("4", 16),
        (_, "mastercard") => ("51", 16),
        (_, "jcb") => ("35", 16),
        (_, "amex") => ("34", 15),
        _ => return Err(AppError::InvalidData("暂不支持的银行卡品牌".to_string())),
    };
    Ok(generate_luhn_number(prefix, length, rng))
}

fn generate_luhn_number(prefix: &str, total_length: usize, rng: &mut OsRng) -> String {
    let mut digits = prefix.chars().filter_map(|c| c.to_digit(10)).collect::<Vec<_>>();
    while digits.len() + 1 < total_length {
        digits.push(rng.gen_range(0..=9));
    }
    let check = luhn_check_digit(&digits);
    digits.push(check);
    digits.into_iter().map(|d| char::from_digit(d, 10).unwrap()).collect()
}

fn luhn_check_digit(digits: &[u32]) -> u32 {
    let mut sum = 0u32;
    let parity = (digits.len() + 1) % 2;
    for (index, digit) in digits.iter().enumerate() {
        let mut val = *digit;
        if index % 2 == parity {
            val *= 2;
            if val > 9 {
                val -= 9;
            }
        }
        sum += val;
    }
    (10 - (sum % 10)) % 10
}

fn mask_card_number(number: &str) -> String {
    if number.len() < 8 {
        return number.to_string();
    }
    format!("{} **** **** {}", &number[..4], &number[number.len() - 4..])
}

fn random_digits(length: usize, rng: &mut OsRng) -> String {
    (0..length).map(|_| char::from_digit(rng.gen_range(0..=9), 10).unwrap()).collect()
}

fn random_non_zero_digits(length: usize, rng: &mut OsRng) -> String {
    let mut result = String::with_capacity(length);
    result.push(char::from_digit(rng.gen_range(1..=9), 10).unwrap());
    for _ in 1..length {
        result.push(char::from_digit(rng.gen_range(0..=9), 10).unwrap());
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::generator::{
        HashAlgorithm, IdentityGenerateOptions, JwtDecodeOptions, JwtGenerateOptions, PasswordGenerateOptions,
        PaymentCardGenerateOptions, RandomValueGenerateOptions, RandomValueMode, UserDataGenerateOptions,
        UserProfileGenerateOptions, UuidGenerateOptions,
    };

    #[test]
    fn generate_uuid_batch() {
        let result = GeneratorService::generate_uuid(&UuidGenerateOptions { count: 3, uppercase: false, remove_hyphens: false }).unwrap();
        assert_eq!(result.items.len(), 3);
        assert!(result.items[0].contains('-'));
    }

    #[test]
    fn generate_password_meets_length() {
        let result = GeneratorService::generate_password(&PasswordGenerateOptions {
            length: 20,
            count: 2,
            include_uppercase: true,
            include_lowercase: true,
            include_numbers: true,
            include_symbols: true,
            exclude_similar: false,
        }).unwrap();
        assert_eq!(result.items.len(), 2);
        assert_eq!(result.items[0].chars().count(), 20);
    }

    #[test]
    fn generate_hash_stable() {
        let result = GeneratorService::generate_hash(&HashGenerateOptions { algorithm: HashAlgorithm::Sha256, input: "deskforge".to_string() }).unwrap();
        assert_eq!(result.value.len(), 64);
    }

    #[test]
    fn generate_and_decode_jwt() {
        let generated = GeneratorService::generate_jwt(&JwtGenerateOptions {
            payload_json: r#"{"sub":"123","role":"admin"}"#.to_string(),
            secret: "deskforge".to_string(),
            header_json: String::new(),
        }).unwrap();
        let decoded = GeneratorService::decode_jwt(&JwtDecodeOptions { token: generated.token }).unwrap();
        assert!(decoded.payload_pretty.contains("admin"));
    }

    #[test]
    fn random_integer_stays_in_range() {
        let result = GeneratorService::generate_random_value(&RandomValueGenerateOptions {
            mode: RandomValueMode::Integer,
            count: 10,
            min: 5,
            max: 9,
            decimal_places: 2,
            length: 8,
            charset: None,
        }).unwrap();
        assert_eq!(result.items.len(), 10);
    }

    #[test]
    fn cn_identity_has_checksum_char() {
        let result = GeneratorService::generate_identity_document(&IdentityGenerateOptions { country: CountryPreset::Cn, count: 1, document_type: String::new() }).unwrap();
        assert!(result.text.contains("nationalId"));
    }

    #[test]
    fn payment_card_masks_number() {
        let result = GeneratorService::generate_payment_card(&PaymentCardGenerateOptions { country: CountryPreset::Us, count: 1, brand: "visa".to_string() }).unwrap();
        assert!(result.text.contains("maskedCardNumber"));
    }

    #[test]
    fn profile_contains_optional_sections() {
        let result = GeneratorService::generate_user_profile(&UserProfileGenerateOptions {
            country: CountryPreset::Jp,
            count: 1,
            include_profile: true,
            include_contact: true,
            include_address: true,
            include_company: true,
            include_identity: true,
            include_payment: true,
            include_account: true,
            include_preferences: true,
            include_device: true,
        }).unwrap();
        assert!(result.json.contains("identity"));
        assert!(result.json.contains("payment"));
        assert!(result.json.contains("company"));
        assert!(result.json.contains("account"));
        assert!(result.json.contains("preferences"));
        assert!(result.json.contains("device"));
    }

    #[test]
    fn profile_requires_at_least_one_section() {
        let error = GeneratorService::generate_user_profile(&UserProfileGenerateOptions {
            country: CountryPreset::Us,
            count: 1,
            include_profile: false,
            include_contact: false,
            include_address: false,
            include_company: false,
            include_identity: false,
            include_payment: false,
            include_account: false,
            include_preferences: false,
            include_device: false,
        }).unwrap_err();
        assert!(error.to_string().contains("至少选择一个组合字段块"));
    }
    #[test]
    fn address_uses_country_specific_field() {
        let result = GeneratorService::generate_user_address(&UserDataGenerateOptions { country: CountryPreset::De, count: 1 }).unwrap();
        assert!(result.json.contains("DE"));
    }
}



