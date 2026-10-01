import Editor from '@monaco-editor/react';

export const LANGUAGES = [
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'c', label: 'C' },
  { id: 'go', label: 'Go' },
];

const STARTERS = {
  python: '# Explain your approach out loud, then write your solution here.\n\ndef solve():\n    pass\n',
  java: '// Explain your approach out loud, then write your solution here.\n\nclass Solution {\n    \n}\n',
  cpp: '// Explain your approach out loud, then write your solution here.\n#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    \n};\n',
  javascript: '// Explain your approach out loud, then write your solution here.\n\nfunction solve() {\n  \n}\n',
  c: '// Explain your approach out loud, then write your solution here.\n#include <stdio.h>\n\n',
  go: '// Explain your approach out loud, then write your solution here.\npackage main\n\nfunc solve() {\n\t\n}\n',
};

export function starterCode(lang) {
  return STARTERS[lang] || '';
}

export default function CodeEditor({ code, language, onCode, onLanguage, readOnly }) {
  return (
    <div className="card editor-card">
      <div className="editor-head">
        <strong>Code editor</strong>
        <select value={language} onChange={(e) => onLanguage(e.target.value)} disabled={readOnly}>
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
      </div>
      <div className="editor-wrap">
        <Editor
          height="100%"
          theme="vs-dark"
          language={language}
          value={code}
          onChange={(v) => onCode(v ?? '')}
          loading={<div className="muted">Loading editor…</div>}
          options={{
            readOnly,
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}
