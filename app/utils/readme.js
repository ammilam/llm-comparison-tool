"use client";

export function saveAsReadme(content) {
  // Format date for filename
  const date = new Date();
  const formattedDate = date.toISOString().replace(/:/g, '-').split('.')[0];
  
  // Create markdown content
  let markdownContent = content.text;
  
  // If it's a model response, add header
  if (content.model) {
    markdownContent = `# ${content.model} Response - ${formattedDate}\n\n${markdownContent}`;
  }
  
  // Create a Blob with the markdown content
  const blob = new Blob([markdownContent], { type: 'text/markdown' });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create an anchor element
  const a = document.createElement('a');
  
  // Set the href and download attributes
  a.href = url;
  a.download = `README-${content.model || 'analysis'}-${formattedDate}.md`;
  
  // Append the anchor to the body
  document.body.appendChild(a);
  
  // Click the anchor
  a.click();
  
  // Remove the anchor and revoke the URL
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}