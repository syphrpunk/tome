export type { TomeConfig, TomePlugin } from "./config.js";
export { defineConfig, loadConfig, TomeConfigSchema } from "./config.js";

export function definePlugin(
  plugin: import("./config.js").TomePlugin
): import("./config.js").TomePlugin {
  return plugin;
}

export type {
  AnalyticsEvent,
  AnalyticsSummary,
  PageViewEvent,
  SearchEvent,
} from "./analytics.js";
export {
  aggregateEvents,
  generateAnalyticsScript,
  generateSessionId,
} from "./analytics.js";
export type {
  ChangelogEntry,
  ChangelogSection,
  ChangelogSectionType,
} from "./changelog.js";
export { filterEntries, getSectionColor, parseChangelog } from "./changelog.js";
export type {
  ContentPage,
  ContentSource,
  GitHubSourceOptions,
  NotionSourceOptions,
} from "./content-source.js";
export {
  defineContentSource,
  fetchRemoteContent,
  githubSource,
  notionBlocksToMarkdown,
  notionSource,
  richTextToMd,
} from "./content-source.js";
export type { DeployConfig, DeployResult } from "./deploy.js";
export {
  collectBuildFiles,
  computeFileHashes,
  deployToCloud,
  readAuthToken,
  saveAuthToken,
} from "./deploy.js";
export type { DnsRecord, DomainConfig, DomainStatus } from "./domains.js";
export {
  addDomain,
  checkDomainDns,
  generateDnsRecords,
  listDomains,
  removeDomain,
  validateDomain,
} from "./domains.js";
export {
  formatRelativeDate,
  getGitDatesForFiles,
  getGitLastUpdated,
} from "./git-dates.js";
export type { BrokenLink, LinkCheckResult } from "./link-checker.js";
export {
  checkLinks,
  extractInternalLinks,
  formatLinkCheckResults,
} from "./link-checker.js";
export type { LintIssue, LintResult, LintRuleConfig } from "./linter.js";
export {
  checkBannedWords,
  checkEmptyLinks,
  checkHeadingIncrement,
  checkImageAltText,
  checkParagraphLength,
  checkSingleH1,
  formatLintResults,
  lintPages,
} from "./linter.js";
export type { CodeMeta, PageFrontmatter, ProcessedPage } from "./markdown.js";
export {
  enhanceCodeBlock,
  extractCodeFenceMetas,
  parseCodeMeta,
  processMarkdown,
  processMarkdownFile,
} from "./markdown.js";
export type { McpManifest, McpPage } from "./mcp-server.js";
export {
  createMcpServer,
  getPage,
  listPages,
  loadManifest,
  searchPages,
  startMcpServer,
} from "./mcp-server.js";
export type { MigrationResult as GitbookMigrationResult } from "./migrate-gitbook.js";
export {
  convertGitbookContent,
  migrateFromGitbook,
  parseGitbookConfig,
  parseSummaryNavigation,
} from "./migrate-gitbook.js";
export type { MigrationResult as MintlifyMigrationResult } from "./migrate-mintlify.js";
export {
  convertMintConfig,
  convertMintlifyContent,
  convertMintNavigation,
  migrateFromMintlify,
  parseMintConfig,
} from "./migrate-mintlify.js";
export type { MigrationResult as VitepressMigrationResult } from "./migrate-vitepress.js";
export {
  convertFrontmatter,
  convertSidebarToNavigation,
  convertVitepressContent,
  migrateFromVitepress,
  parseVitepressConfig,
} from "./migrate-vitepress.js";
export type { OgImageConfig, OgImageResult } from "./og-image.js";
export {
  buildOgConfig,
  buildOgTemplate,
  generateOgImages,
  generateOgMetaTags,
  generateOgSvg,
} from "./og-image.js";
export type {
  ApiEndpoint,
  ApiManifest,
  ApiParameter,
  ApiRequestBody,
  ApiResponse,
  CodeSample,
} from "./openapi.js";
export { generateCodeSamples, parseOpenApiSpec } from "./openapi.js";
export type {
  PreviewConfig,
  PreviewDeployment,
  PreviewResult,
} from "./preview.js";
export {
  deletePreview,
  deployPreview,
  detectBranch,
  detectCommitSha,
  detectPrNumber,
  generatePreviewBanner,
  getExpiryDate,
  getPreviewUrl,
  listPreviews,
  slugifyBranch,
} from "./preview.js";
export type {
  Badge,
  BadgeVariant,
  I18nConfig,
  NavigationGroup,
  NavigationItem,
  PageRoute,
  VersioningConfig,
} from "./routes.js";
export {
  buildNavigation,
  discoverPages,
  flattenNavItems,
  getPrevNext,
  normalizeBadge,
} from "./routes.js";
export type {
  DocEntry,
  DocMember,
  DocParam,
  TypeDocConfig,
} from "./typedoc.js";
export {
  extractDocEntries,
  extractDocEntriesFromSource,
  generateMarkdown,
  generateTypeDocs,
} from "./typedoc.js";
export type { TomePluginOptions } from "./vite-plugin.js";
export { default as tomePlugin } from "./vite-plugin.js";
export type {
  WebhookChannel,
  WebhookConfig,
  WebhookEventType,
  WebhookPayload,
  WebhookResult,
} from "./webhooks.js";
export {
  createDeployFailedPayload,
  createDeployPayload,
  createDomainVerifiedPayload,
  createPreviewPayload,
  dispatchWebhooks,
  formatDiscordPayload,
  formatEventTitle,
  formatHttpPayload,
  formatSlackPayload,
  maskUrl,
  sendWebhook,
  signPayload,
} from "./webhooks.js";
