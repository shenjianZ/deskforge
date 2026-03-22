import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/AppShell";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { Home } from "@/pages/Home";
import { Search } from "@/pages/Search";
import Settings from "@/pages/Settings";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { AppReminderCenter } from "@/components/scheduler/AppReminderCenter";
import { ColorPickerPage } from "@/components/features/ColorPicker/ColorPickerPage";
import { JsonFormatterPage } from "@/components/features/JsonFormatter/JsonFormatterPage";
import { HtmlFormatterPage } from "@/components/features/HtmlFormatter/HtmlFormatterPage";
import { XmlFormatterPage } from "@/components/features/XmlFormatter/XmlFormatterPage";
import { CodeFormatterPage } from "@/components/features/CodeFormatter/CodeFormatterPage";
import { SystemInfoPage } from "@/components/features/SystemInfo/SystemInfoPage";
import { QrCodeGeneratorPage } from "@/components/features/QrCodeGenerator/QrCodeGeneratorPage";
import { ApiDebuggerPage } from "@/components/features/ApiDebugger/ApiDebuggerPage";
import { Base64ToolPage } from "@/components/features/Base64Tool/Base64ToolPage";
import { TextToolsPage } from "@/components/features/TextTools/TextToolsPage";
import { DateTimeToolPage } from "@/components/features/DateTimeTool/DateTimeToolPage";
import { PublicIpToolPage } from "@/components/features/PublicIpTool/PublicIpToolPage";
import { DnsLookupToolPage } from "@/components/features/DnsLookupTool/DnsLookupToolPage";
import { WhoisToolPage } from "@/components/features/WhoisTool/WhoisToolPage";
import { ImageConverterPage } from "@/components/features/ImageConverter/ImageConverterPage";
import { ImageCompressorPage } from "@/components/features/ImageCompressor/ImageCompressorPage";
import { ImageCropperPage } from "@/components/features/ImageCropper/ImageCropperPage";
import { ImageResizerPage } from "@/components/features/ImageResizer/ImageResizerPage";
import { MarkdownPreviewPage } from "@/components/features/MarkdownPreview/MarkdownPreviewPage";
import { RegexTesterPage } from "@/components/features/RegexTester/RegexTesterPage";
import { GeneratorHubPage } from "@/components/features/GeneratorHub/GeneratorHubPage";
import { SchedulerCenterPage } from "@/components/features/SchedulerCenter/SchedulerCenterPage";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="min-h-screen">
        <ScrollToTop />
        <CommandPalette />
        <AppReminderCenter />

        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/feature/color-picker" element={<ColorPickerPage />} />
            <Route path="/feature/json-formatter" element={<JsonFormatterPage />} />
            <Route path="/feature/html-formatter" element={<HtmlFormatterPage />} />
            <Route path="/feature/xml-formatter" element={<XmlFormatterPage />} />
            <Route path="/feature/code-formatter" element={<CodeFormatterPage />} />
            <Route path="/feature/base64-tool" element={<Base64ToolPage />} />
            <Route path="/feature/text-tools" element={<TextToolsPage />} />
            <Route path="/feature/timestamp-converter" element={<DateTimeToolPage />} />
            <Route path="/feature/public-ip-tool" element={<PublicIpToolPage />} />
            <Route path="/feature/dns-lookup-tool" element={<DnsLookupToolPage />} />
            <Route path="/feature/whois-tool" element={<WhoisToolPage />} />
            <Route path="/feature/image-converter" element={<ImageConverterPage />} />
            <Route path="/feature/image-compressor" element={<ImageCompressorPage />} />
            <Route path="/feature/image-cropper" element={<ImageCropperPage />} />
            <Route path="/feature/image-resizer" element={<ImageResizerPage />} />
            <Route path="/feature/markdown-preview" element={<MarkdownPreviewPage />} />
            <Route path="/feature/regex-tester" element={<RegexTesterPage />} />
            <Route path="/feature/generator-hub" element={<GeneratorHubPage />} />
            <Route path="/feature/system-info" element={<SystemInfoPage />} />
            <Route path="/feature/scheduler-center" element={<SchedulerCenterPage />} />
            <Route path="/feature/qr-generator" element={<QrCodeGeneratorPage />} />
            <Route path="/feature/api-debugger" element={<ApiDebuggerPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </div>
    </ThemeProvider>
  );
}

export default App;
