import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { FormatterWorkbench } from '@/components/features/FormatterWorkbench';
import { PageSection } from '@/components/layout/PageSection';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type { CodeFormatConfig, CodeFormatResult, CodeValidateResult, CodeLanguage } from '@/types/code';

const LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'rust', label: 'Rust' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
];

export function CodeFormatterPage() {
  const { defaultCodeIndent, autoCollapseInput, wrapLongLines } = usePreferencesStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [validation, setValidation] = useState<CodeValidateResult | null>(null);
  const [config, setConfig] = useState<CodeFormatConfig>({
    language: 'javascript',
    indent: defaultCodeIndent,
    useTabs: false,
    mode: 'pretty',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);

  const validateCode = useCallback(async () => {
    if (!input.trim()) {
      setValidation(null);
      return;
    }

    try {
      const result = await invoke<CodeValidateResult>('validate_code', {
        input,
        language: config.language,
      });
      setValidation(result);
    } catch (error) {
      setValidation({
        isValid: false,
        errorMessage: `验证失败: ${String(error)}`,
      });
    }
  }, [input, config.language]);

  useEffect(() => {
    setConfig((prev) => ({ ...prev, indent: defaultCodeIndent }));
  }, [defaultCodeIndent]);

  useEffect(() => {
    if (input.trim()) {
      validateCode();
    } else {
      setValidation(null);
    }
  }, [input, config.language, validateCode]);

  const formatCode = useCallback(async () => {
    if (!input.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await invoke<CodeFormatResult>('format_code', { input, config });
      setOutput(result.success ? result.result : result.error || '格式化失败');
      if (result.success && autoCollapseInput) {
        setIsInputCollapsed(true);
      }
    } catch (error) {
      setOutput(`错误: ${String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [input, config, autoCollapseInput]);

  const clearInput = useCallback(() => {
    setInput('');
    setOutput('');
    setValidation(null);
  }, []);

  const loadExample = useCallback(() => {
    const examples: Record<CodeLanguage, string> = {
      javascript: 'function test(){const x=1;return x*2;}',
      typescript: 'function test():number{const x:number=1;return x*2;}',
      java: 'public class Test{public int test(){int x=1;return x*2;}}',
      cpp: 'int test(){int x=1;return x*2;}',
      rust: 'fn test()->i32{let x=1;x*2}',
      python: 'def test():\n\tx=1\n\treturn x*2',
      sql: 'SELECT*FROM users WHERE id=1',
      html: '<div><span>test</span></div>',
      css: '.test{color:red;font-size:14px}',
      json: '{"name":"test","value":123}',
      xml: '<root><item>test</item></root>',
    };
    setInput(examples[config.language]);
  }, [config.language]);

  return (
    <PageSection>
      <FormatterWorkbench
        inputLabel="输入代码"
        inputDescription="多语言基础格式化入口，适合快速整理代码片段。"
        outputLanguage={config.language}
        outputDescription="输出区统一复用高亮、复制和结果统计。"
        input={input}
        onInputChange={setInput}
        output={output}
        validation={validation}
        isProcessing={isProcessing}
        isInputCollapsed={isInputCollapsed}
        onInputCollapseChange={setIsInputCollapsed}
        onPrimaryAction={formatCode}
        primaryActionLabel="格式化"
        onClear={clearInput}
        onLoadExample={loadExample}
        wrapLongLines={wrapLongLines}
        configPanel={
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">语言</span>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((language) => (
                  <Button
                    key={language.value}
                    size="sm"
                    variant={config.language === language.value ? 'default' : 'outline'}
                    onClick={() => setConfig((prev) => ({ ...prev, language: language.value }))}
                  >
                    {language.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">缩进</span>
                <div className="flex gap-2">
                  {[2, 4, 8].map((spaces) => (
                    <Button
                      key={spaces}
                      size="sm"
                      variant={config.indent === spaces ? 'default' : 'outline'}
                      onClick={() => setConfig((prev) => ({ ...prev, indent: spaces }))}
                    >
                      {spaces} 空格
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Tab</span>
                <Button
                  size="sm"
                  variant={config.useTabs ? 'default' : 'outline'}
                  onClick={() => setConfig((prev) => ({ ...prev, useTabs: !prev.useTabs }))}
                >
                  {config.useTabs ? '开启' : '关闭'}
                </Button>
              </div>
            </div>
          </div>
        }
        helpContent={
          <>
            <p>1. 选择语言后输入代码，系统按当前语言做基础校验。</p>
            <p>2. 适用于快速美化片段，不替代各语言的专业 formatter。</p>
            <p>3. 示例数据会跟随语言切换，方便立即验证格式化效果。</p>
          </>
        }
      />
    </PageSection>
  );
}
