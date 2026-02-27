#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Verifies that all components are correctly imported and deployed
 * Prevents deployment mismatches by checking for common issues
 */

import fs from 'fs';
import path from 'path';

interface VerificationResult {
  passed: boolean;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }[];
  summary: string;
}

const projectRoot = path.resolve(__dirname, '..');

// Check 1: Verify Landing component is using new LandingScreen
function checkLandingComponent(): { status: 'pass' | 'fail'; message: string } {
  const appPagePath = path.join(projectRoot, 'app', 'page.tsx');
  const content = fs.readFileSync(appPagePath, 'utf-8');

  if (content.includes("from '@/screens/Landing'") && content.includes('LandingScreen')) {
    return { status: 'pass', message: '✓ app/page.tsx correctly imports new LandingScreen' };
  } else if (content.includes("from './ui/Landing'")) {
    return { status: 'fail', message: '✗ app/page.tsx still imports old Landing component' };
  }
  return { status: 'fail', message: '✗ app/page.tsx Landing import not found' };
}

// Check 2: Verify all screen imports use @/screens
function checkScreenImports(): { status: 'pass' | 'fail' | 'warning'; message: string } {
  const appUiPath = path.join(projectRoot, 'app', 'ui');
  const files = fs.readdirSync(appUiPath).filter((f) => f.endsWith('.tsx'));

  const oldImports = files.filter((f) => {
    const content = fs.readFileSync(path.join(appUiPath, f), 'utf-8');
    return content.includes("from './") && content.includes('Screen');
  });

  if (oldImports.length === 0) {
    return { status: 'pass', message: '✓ All screen imports use correct paths' };
  }
  return {
    status: 'warning',
    message: `⚠ Found ${oldImports.length} files with relative screen imports: ${oldImports.join(', ')}`,
  };
}

// Check 3: Verify AI engines are imported from @/lib/ai
function checkAIEngineImports(): { status: 'pass' | 'fail'; message: string } {
  const chatRoutePath = path.join(projectRoot, 'app', 'api', 'chat', 'route.ts');
  const content = fs.readFileSync(chatRoutePath, 'utf-8');

  const aiImports = content.match(/from ['"]@\/lib\/ai\/[^'"]+['"]/g) || [];
  const invalidImports = content.match(/from ['"]\.\.\/[^'"]*ai[^'"]*['"]/g) || [];

  if (aiImports.length > 0 && invalidImports.length === 0) {
    return { status: 'pass', message: `✓ Chat route correctly imports ${aiImports.length} AI engines from @/lib/ai` };
  }
  return { status: 'fail', message: '✗ Chat route has invalid AI engine imports' };
}

// Check 4: Verify conversation components exist
function checkConversationComponents(): { status: 'pass' | 'fail'; message: string } {
  const screensPath = path.join(projectRoot, 'src', 'screens');
  const conversationPath = path.join(screensPath, 'Conversation.tsx');

  if (fs.existsSync(conversationPath)) {
    const content = fs.readFileSync(conversationPath, 'utf-8');
    if (content.includes('export function ConversationScreen')) {
      return { status: 'pass', message: '✓ ConversationScreen component exists and is exported' };
    }
  }
  return { status: 'fail', message: '✗ ConversationScreen component not found or not exported' };
}

// Check 5: Verify database components are correctly imported
function checkDatabaseImports(): { status: 'pass' | 'fail'; message: string } {
  const atlasAppPath = path.join(projectRoot, 'app', 'ui', 'AtlasApp.tsx');
  const content = fs.readFileSync(atlasAppPath, 'utf-8');

  if (content.includes("from '@/lib/db/atlasDb'") && content.includes('AtlasDb')) {
    return { status: 'pass', message: '✓ AtlasApp correctly imports database components' };
  }
  return { status: 'fail', message: '✗ AtlasApp database imports are incorrect' };
}

// Check 6: Verify Claude client is correctly imported
function checkClaudeClient(): { status: 'pass' | 'fail'; message: string } {
  const atlasAppPath = path.join(projectRoot, 'app', 'ui', 'AtlasApp.tsx');
  const content = fs.readFileSync(atlasAppPath, 'utf-8');

  if (content.includes("from '@/lib/api/client'") && content.includes('ClaudeClient')) {
    return { status: 'pass', message: '✓ AtlasApp correctly imports ClaudeClient' };
  }
  return { status: 'fail', message: '✗ ClaudeClient import is incorrect' };
}

// Check 7: Verify no duplicate components exist
function checkDuplicateComponents(): { status: 'pass' | 'warning'; message: string } {
  const duplicates: string[] = [];

  // Check for duplicate Landing components
  const appUiLanding = path.join(projectRoot, 'app', 'ui', 'Landing.tsx');
  const screensLanding = path.join(projectRoot, 'src', 'screens', 'Landing.tsx');

  if (fs.existsSync(appUiLanding) && fs.existsSync(screensLanding)) {
    duplicates.push('Landing');
  }

  if (duplicates.length === 0) {
    return { status: 'pass', message: '✓ No duplicate component files found' };
  }
  return {
    status: 'warning',
    message: `⚠ Found duplicate components: ${duplicates.join(', ')}. Consider removing old versions.`,
  };
}

// Check 8: Verify build configuration
function checkBuildConfig(): { status: 'pass' | 'fail'; message: string } {
  const nextConfigPath = path.join(projectRoot, 'next.config.ts');
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');

  if (fs.existsSync(nextConfigPath) && fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    if (tsconfig.compilerOptions?.baseUrl === '.' && tsconfig.compilerOptions?.paths?.['@/*']) {
      return { status: 'pass', message: '✓ Build configuration is correct' };
    }
  }
  return { status: 'fail', message: '✗ Build configuration is incorrect' };
}

// Run all checks
function runVerification(): VerificationResult {
  const checks = [
    { name: 'Landing Component', fn: checkLandingComponent },
    { name: 'Screen Imports', fn: checkScreenImports },
    { name: 'AI Engine Imports', fn: checkAIEngineImports },
    { name: 'Conversation Components', fn: checkConversationComponents },
    { name: 'Database Imports', fn: checkDatabaseImports },
    { name: 'Claude Client', fn: checkClaudeClient },
    { name: 'Duplicate Components', fn: checkDuplicateComponents },
    { name: 'Build Configuration', fn: checkBuildConfig },
  ];

  const results = checks.map((check) => ({
    name: check.name,
    ...check.fn(),
  }));

  const passed = results.every((r) => r.status !== 'fail');
  const warnings = results.filter((r) => r.status === 'warning').length;
  const failures = results.filter((r) => r.status === 'fail').length;

  let summary = `Verification ${passed ? 'PASSED' : 'FAILED'}: `;
  summary += `${results.filter((r) => r.status === 'pass').length} passed`;
  if (warnings > 0) summary += `, ${warnings} warnings`;
  if (failures > 0) summary += `, ${failures} failures`;

  return {
    passed,
    checks: results,
    summary,
  };
}

// Main execution
const result = runVerification();

console.log('\n' + '='.repeat(60));
console.log('DEPLOYMENT VERIFICATION REPORT');
console.log('='.repeat(60) + '\n');

result.checks.forEach((check) => {
  const icon = check.status === 'pass' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
  console.log(`${icon} ${check.name}`);
  console.log(`  ${check.message}\n`);
});

console.log('='.repeat(60));
console.log(result.summary);
console.log('='.repeat(60) + '\n');

process.exit(result.passed ? 0 : 1);
