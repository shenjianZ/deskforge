import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/AppShell";
import { Home } from "@/pages/Home";
import { Search } from "@/pages/Search";
import Settings from "@/pages/Settings";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { ColorPickerPage } from "@/components/features/ColorPicker/ColorPickerPage";
import { JsonFormatterPage } from "@/components/features/JsonFormatter/JsonFormatterPage";
import { HtmlFormatterPage } from "@/components/features/HtmlFormatter/HtmlFormatterPage";
import { XmlFormatterPage } from "@/components/features/XmlFormatter/XmlFormatterPage";
import { CodeFormatterPage } from "@/components/features/CodeFormatter/CodeFormatterPage";
import { SystemInfoPage } from "@/components/features/SystemInfo/SystemInfoPage";
import { QrCodeGeneratorPage } from "@/components/features/QrCodeGenerator/QrCodeGeneratorPage";
import { ApiDebuggerPage } from "@/components/features/ApiDebugger/ApiDebuggerPage";
import { Base64ToolPage } from "@/components/features/Base64Tool/Base64ToolPage";
import { DateTimeToolPage } from "@/components/features/DateTimeTool/DateTimeToolPage";
import { PublicIpToolPage } from "@/components/features/PublicIpTool/PublicIpToolPage";
import { DnsLookupToolPage } from "@/components/features/DnsLookupTool/DnsLookupToolPage";
import { WhoisToolPage } from "@/components/features/WhoisTool/WhoisToolPage";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="min-h-screen">
        {/* 全局快捷键监听 */}
        <CommandPalette />

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
            <Route path="/feature/timestamp-converter" element={<DateTimeToolPage />} />
            <Route path="/feature/public-ip-tool" element={<PublicIpToolPage />} />
            <Route path="/feature/dns-lookup-tool" element={<DnsLookupToolPage />} />
            <Route path="/feature/whois-tool" element={<WhoisToolPage />} />
            <Route path="/feature/system-info" element={<SystemInfoPage />} />
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
