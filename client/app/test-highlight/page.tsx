'use client';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export default function TestHighlightPage() {
  const testContent = `
# Test Keyword Highlighting

This is a test of <mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">keyword highlighting</mark> in our content.

## Why Use Keyword Highlighting?

When you use <mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">SEO optimization</mark>, your content becomes more visible. The <mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">digital marketing</mark> landscape requires strategic <mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">content strategy</mark>.

## Benefits

- Better <mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">search rankings</mark>
- Improved <mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">user engagement</mark>
- Enhanced <mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">visibility</mark>

Regular text without highlighting should look normal.
`;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="card mb-8">
          <h1 className="text-3xl font-bold mb-4">Keyword Highlighting Test</h1>
          <p className="text-gray-600 mb-4">
            This page tests if the HTML mark tags with inline styles are properly rendered.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Expected:</strong> Keywords should have a light peach/cream background (#FFF4E6) with padding and rounded corners.
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold mb-4">Rendered Content:</h2>
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
              {testContent}
            </ReactMarkdown>
          </div>
        </div>

        <div className="card mt-8">
          <h2 className="text-2xl font-bold mb-4">Raw HTML Test:</h2>
          <p className="mb-4">
            This is a direct HTML test: <mark style={{backgroundColor: '#FFF4E6', padding: '2px 4px', borderRadius: '3px'}}>highlighted keyword</mark> in JSX.
          </p>
        </div>
      </div>
    </div>
  );
}
