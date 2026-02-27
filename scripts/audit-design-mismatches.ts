#!/usr/bin/env node

/**
 * Design Mismatch Audit Script
 * Identifies inconsistencies in component styling across the app
 */

import fs from 'fs';
import path from 'path';

interface AuditResult {
  file: string;
  issues: {
    type: string;
    severity: 'critical' | 'high' | 'medium';
    description: string;
    line?: number;
  }[];
}

const projectRoot = path.resolve(__dirname, '..');

function auditFile(filePath: string): AuditResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues: AuditResult['issues'] = [];
  const lines = content.split('\n');

  // Check for Tailwind color classes instead of CSS variables
  const tailwindColorPattern = /\b(bg-teal|bg-slate|text-slate|border-slate|hover:bg-teal|hover:bg-slate|active:bg-teal|active:bg-slate)\b/g;
  const tailwindMatches = content.match(tailwindColorPattern);
  if (tailwindMatches && tailwindMatches.length > 0) {
    issues.push({
      type: 'Color System Mismatch',
      severity: 'critical',
      description: `Uses Tailwind colors (${tailwindMatches[0]}) instead of CSS variables (--teal, --bg, --card, etc.)`,
    });
  }

  // Check for hardcoded colors instead of CSS variables
  const hardcodedColorPattern = /#[0-9A-Fa-f]{6}|rgb\(|rgba\(/g;
  const hardcodedMatches = content.match(hardcodedColorPattern);
  if (hardcodedMatches && hardcodedMatches.length > 2) {
    issues.push({
      type: 'Hardcoded Colors',
      severity: 'high',
      description: `Contains hardcoded colors instead of CSS variables`,
    });
  }

  // Check for inline styles instead of classes
  const inlineStylePattern = /style=\{\{[^}]*(?:color|background|border|padding|margin)[^}]*\}\}/g;
  const inlineMatches = content.match(inlineStylePattern);
  if (inlineMatches && inlineMatches.length > 5) {
    issues.push({
      type: 'Excessive Inline Styles',
      severity: 'high',
      description: `Uses inline styles instead of CSS classes (found ${inlineMatches.length} instances)`,
    });
  }

  // Check for missing button classes
  if (filePath.includes('Button') || filePath.includes('button')) {
    if (!content.includes('.btn') && content.includes('className') && !content.includes('btnPrimary')) {
      if (content.includes('bg-') || content.includes('px-') || content.includes('py-')) {
        issues.push({
          type: 'Button Styling Mismatch',
          severity: 'critical',
          description: `Button component uses Tailwind classes instead of .btn, .btnPrimary, .btnSecondary`,
        });
      }
    }
  }

  // Check for className vs style inconsistency
  const hasClassName = content.includes('className=');
  const hasStyle = content.includes('style=');
  if (hasClassName && hasStyle) {
    const classNameCount = (content.match(/className=/g) || []).length;
    const styleCount = (content.match(/style=/g) || []).length;
    if (styleCount > classNameCount * 0.5) {
      issues.push({
        type: 'Mixed Styling Approach',
        severity: 'medium',
        description: `Mixes className and inline styles inconsistently`,
      });
    }
  }

  // Check for missing dark mode support
  if (content.includes('bg-white') && !content.includes('dark:')) {
    issues.push({
      type: 'Missing Dark Mode',
      severity: 'medium',
      description: `Uses light colors without dark mode variants`,
    });
  }

  return {
    file: filePath.replace(projectRoot, ''),
    issues,
  };
}

function runAudit() {
  const componentPaths = [
    'app/ui/NavBar.tsx',
    'app/ui/Footer.tsx',
    'app/ui/Landing.tsx',
    'src/components/Buttons.tsx',
    'src/components/TopBar.tsx',
    'src/screens/Landing.tsx',
    'src/screens/Conversation.tsx',
  ];

  const results: AuditResult[] = [];

  for (const componentPath of componentPaths) {
    const fullPath = path.join(projectRoot, componentPath);
    if (fs.existsSync(fullPath)) {
      results.push(auditFile(fullPath));
    }
  }

  // Print results
  console.log('\n' + '='.repeat(70));
  console.log('DESIGN MISMATCH AUDIT REPORT');
  console.log('='.repeat(70) + '\n');

  let totalIssues = 0;
  let criticalIssues = 0;
  let highIssues = 0;

  for (const result of results) {
    if (result.issues.length > 0) {
      console.log(`📄 ${result.file}`);
      for (const issue of result.issues) {
        const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : '🟡';
        console.log(`  ${icon} [${issue.severity.toUpperCase()}] ${issue.type}`);
        console.log(`     ${issue.description}\n`);

        totalIssues++;
        if (issue.severity === 'critical') criticalIssues++;
        if (issue.severity === 'high') highIssues++;
      }
    }
  }

  console.log('='.repeat(70));
  console.log(`SUMMARY: ${totalIssues} issues found`);
  console.log(`  🔴 Critical: ${criticalIssues}`);
  console.log(`  🟠 High: ${highIssues}`);
  console.log(`  🟡 Medium: ${totalIssues - criticalIssues - highIssues}`);
  console.log('='.repeat(70) + '\n');

  return criticalIssues === 0 && highIssues === 0;
}

const passed = runAudit();
process.exit(passed ? 0 : 1);
