import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Calendar, ArrowLeft, Home, ChevronRight, ChevronUp, Copy, Check, Download, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import { TutorialPayload, TutorialAsset } from '../services/conversations';

interface ArticleViewProps {
  article: {
    id?: string;
    title: string;
    tutorialData?: TutorialPayload;
  };
  onNewTutorial: () => void;
  user: any;
  onConversationCreated?: () => void;
  isDark: boolean;
  onOpenSidebar?: () => void;
}

/**
 * Convert S3 URL to public HTTP URL
 * s3://bucket-name/key -> https://bucket-name.s3.amazonaws.com/key
 */
function convertS3ToHttp(s3Url: string): string {
  if (!s3Url.startsWith('s3://')) {
    return s3Url; // Already HTTP or other format
  }

  const withoutProtocol = s3Url.slice(5); // Remove 's3://'
  const slashIndex = withoutProtocol.indexOf('/');

  if (slashIndex === -1) {
    return s3Url; // Invalid format
  }

  const bucket = withoutProtocol.slice(0, slashIndex);
  const key = withoutProtocol.slice(slashIndex + 1);

  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

/**
 * Resolve asset URL from ID using assets dictionary
 */
function resolveAssetUrl(assetId: string, assets: Record<string, TutorialAsset>): string {
  const asset = assets[assetId];

  if (!asset) {
    console.warn(`[ArticleView] Asset Resolution Warning: Asset ID '${assetId}' not found in payload.`);
    return `https://placehold.co/600x400?text=Asset+Not+Found`;
  }

  if (asset.type === 'url') {
    const url = convertS3ToHttp(asset.data);
    // console.debug(`[ArticleView] Resolved S3 asset: ${assetId} -> ${url}`);
    return url;
  }

  // For base64, return data URL
  // console.debug(`[ArticleView] Resolved Base64 asset: ${assetId}`);
  return asset.data;
}

/**
 * Interactive Code Block Component with syntax highlighting and copy button
 */
function InteractiveCodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Map common languages to display names and colors
  const langConfig: Record<string, { name: string; color: string }> = {
    python: { name: 'Python', color: 'from-blue-500/20 to-yellow-500/20' },
    javascript: { name: 'JavaScript', color: 'from-yellow-500/20 to-yellow-600/20' },
    typescript: { name: 'TypeScript', color: 'from-blue-500/20 to-blue-600/20' },
    jsx: { name: 'JSX', color: 'from-cyan-500/20 to-blue-500/20' },
    tsx: { name: 'TSX', color: 'from-blue-500/20 to-cyan-500/20' },
    html: { name: 'HTML', color: 'from-orange-500/20 to-red-500/20' },
    css: { name: 'CSS', color: 'from-blue-500/20 to-purple-500/20' },
    sql: { name: 'SQL', color: 'from-orange-500/20 to-orange-600/20' },
    bash: { name: 'Bash', color: 'from-green-500/20 to-green-600/20' },
    json: { name: 'JSON', color: 'from-gray-500/20 to-gray-600/20' },
  };

  const config = langConfig[language.toLowerCase()] || { name: language || 'Code', color: 'from-gray-500/20 to-gray-600/20' };

  return (
    <div className="relative group my-8 rounded-xl overflow-hidden shadow-lg shadow-black/20">
      {/* Header bar with gradient */}
      <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${config.color} backdrop-blur-sm border-b border-white/10`}>
        <div className="flex items-center gap-3">
          {/* Terminal dots */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          {/* Language badge */}
          <span className="text-xs font-medium text-white/80 bg-white/10 px-2.5 py-1 rounded-md">
            {config.name}
          </span>
        </div>
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${copied
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check size={14} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre className="bg-slate-900/95 p-5 overflow-x-auto">
        <code className="text-sm text-emerald-300 font-mono leading-relaxed whitespace-pre-wrap">
          {code}
        </code>
      </pre>
    </div>
  );
}

/**
 * Parse tutorial content and extract interactive code blocks
 * Returns array of content segments (either markdown text or code blocks)
 */
function parseContent(
  tutorialContent: string | undefined,
  assets: Record<string, TutorialAsset> | undefined
): Array<{ type: 'markdown' | 'code'; content: string; language?: string }> {
  const segments: Array<{ type: 'markdown' | 'code'; content: string; language?: string }> = [];

  // Guard against undefined content
  if (!tutorialContent) {
    console.warn('[ArticleView] No tutorial content to parse');
    return segments;
  }

  // Regex to find <interactive-code> blocks
  const codeBlockRegex = /<interactive-code>([\s\S]*?)<\/interactive-code>/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(tutorialContent)) !== null) {
    // Add markdown content before this code block
    if (match.index > lastIndex) {
      const markdownContent = tutorialContent.slice(lastIndex, match.index);
      if (markdownContent.trim()) {
        segments.push({ type: 'markdown', content: markdownContent });
      }
    }

    // Parse the code block - first line is language, rest is code
    const codeContent = match[1].trim();
    const lines = codeContent.split('\n');
    const language = lines[0]?.trim() || 'text';
    const code = lines.slice(1).join('\n').trim();

    segments.push({ type: 'code', content: code, language });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining markdown content
  if (lastIndex < tutorialContent.length) {
    const remainingContent = tutorialContent.slice(lastIndex);
    if (remainingContent.trim()) {
      segments.push({ type: 'markdown', content: remainingContent });
    }
  }

  console.log(`[ArticleView] Content Parsing: Found ${segments.filter(s => s.type === 'code').length} interactive blocks and ${segments.filter(s => s.type === 'markdown').length} markdown segments.`);

  return segments;
}

export function ArticleView({ article, onNewTutorial, user, onConversationCreated, isDark, onOpenSidebar }: ArticleViewProps) {
  const [loading, setLoading] = useState(true);
  const [tutorialPayload, setTutorialPayload] = useState<TutorialPayload | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [readTime, setReadTime] = useState<string>('5 min read');
  const articleRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Calculate reading time based on word count (approx 200 words/min)
   */
  const calculateReadTime = (content: string): string => {
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  /**
   * Format date relative to now (ArticleView specific)
   */
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Just now';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  // Theme-aware color classes
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-white/10' : 'border-gray-200';
  const glassClass = isDark ? 'glass-surface' : 'bg-gray-50';
  const hoverTextClass = isDark ? 'hover:text-white' : 'hover:text-gray-900';
  const hoverBorderClass = isDark ? 'hover:border-electric-blue' : 'hover:border-blue-500';

  // Scroll progress logic
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Find the actual scrolling parent (created in MainLayout)
    const scrollParent = container.closest('.overflow-y-auto') as HTMLElement;
    if (!scrollParent) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollParent;
      const windowHeight = clientHeight;
      const fullHeight = scrollHeight;

      if (fullHeight === windowHeight) return;

      const progress = (scrollTop / (fullHeight - windowHeight)) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
      setShowBackToTop(scrollTop > 500);
    };

    // Initial check
    handleScroll();

    scrollParent.addEventListener('scroll', handleScroll);
    return () => scrollParent.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    const container = scrollContainerRef.current;
    const scrollParent = container?.closest('.overflow-y-auto');
    scrollParent?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    loadContent();
  }, [article]);

  const loadContent = async () => {
    setLoading(true);

    try {
      // Check if tutorial data is already provided (from QueryInterface)
      if (article.tutorialData) {
        console.log('[ArticleView] Using provided tutorial data:', article.tutorialData);

        // Handle nested structure from QueryInterface
        // QueryInterface passes: { title, tutorialData: TutorialPayload, conversationId }
        // So article.tutorialData might be that wrapper, or directly a TutorialPayload
        let payload: any = article.tutorialData;

        // Check if it's the wrapper object (has nested tutorialData)
        if (payload.tutorialData && payload.tutorialData.tutorial_content) {
          console.log('[ArticleView] Extracting nested tutorialData');
          payload = payload.tutorialData;
        }

        // Verify we have the expected structure
        if (payload.tutorial_content) {
          console.log('[ArticleView] Found tutorial_content, setting payload');
          setTutorialPayload(payload);
          setReadTime(calculateReadTime(payload.tutorial_content));
          setCreatedAt(new Date().toISOString());
        } else {
          console.warn('[ArticleView] tutorialData missing tutorial_content:', payload);
        }

        setLoading(false);
        return;
      }

      // If article has an ID but no tutorialData, fetch from Supabase
      if (article.id && user) {
        console.log('[ArticleView] Fetching conversation from Supabase:', article.id);

        const { loadConversation } = await import('../services/conversations');
        const conversation = await loadConversation(article.id, user.id);

        if (conversation && conversation.response_payload) {
          console.log('[ArticleView] Loaded conversation from Supabase:', conversation);
          setCreatedAt(conversation.created_at);

          // The response_payload should be TutorialPayload format
          let payload: any = conversation.response_payload;

          // Check for nested structure or new format
          if (payload.tutorial_content) {
            console.log('[ArticleView] Found tutorial_content in response_payload');
            setTutorialPayload(payload);
            setReadTime(calculateReadTime(payload.tutorial_content));
          } else if (payload.tutorialData && payload.tutorialData.tutorial_content) {
            console.log('[ArticleView] Extracting nested tutorialData from response_payload');
            setTutorialPayload(payload.tutorialData);
            setReadTime(calculateReadTime(payload.tutorialData.tutorial_content));
          } else {
            console.warn('[ArticleView] response_payload format not recognized:', payload);
          }
        } else {
          console.warn('[ArticleView] No response_payload in conversation');
        }

        setLoading(false);
        return;
      }

      console.warn('[ArticleView] Load Content: No tutorial data or conversation ID provided.');
      setLoading(false);
    } catch (error) {
      console.error('[ArticleView] Load Content Error:', error);
      setLoading(false);
    }
  };

  /**
   * Generate and download PDF of the tutorial using jsPDF
   * This manually builds the PDF from the tutorial content, bypassing html2canvas
   */
  const handleDownloadPDF = async () => {
    console.log('[PDF] ========== Starting PDF Generation with jsPDF ==========');

    if (!tutorialPayload?.tutorial_content) {
      console.error('[PDF] FAILED: No tutorial content available');
      return;
    }

    setIsGeneratingPDF(true);
    await new Promise(resolve => setTimeout(resolve, 100)); // UI update

    const startTime = performance.now();

    try {
      const filename = `${article.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_tutorial.pdf`;
      console.log('[PDF] Filename:', filename);

      // Create PDF document (A4 size)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let y = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace: number) => {
        if (y + requiredSpace > pageHeight - margin) {
          doc.addPage();
          y = margin;
          return true;
        }
        return false;
      };

      // Helper function to add wrapped text
      const addWrappedText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [30, 41, 59]) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(color[0], color[1], color[2]);

        const lines = doc.splitTextToSize(text, contentWidth);
        const lineHeight = fontSize * 0.5;

        for (const line of lines) {
          checkPageBreak(lineHeight);
          doc.text(line, margin, y);
          y += lineHeight;
        }
        y += 2; // Small gap after text block
      };

      // Helper function to load image and convert to base64
      const fetchImageAsBase64 = async (url: string): Promise<{ data: string; width: number; height: number } | null> => {
        console.log('[PDF] Loading image:', url);

        // Helper to try loading an image
        const tryLoad = (imgUrl: string, useCors: boolean): Promise<{ data: string; width: number; height: number } | null> => {
          return new Promise((resolve) => {
            const img = new Image();
            if (useCors) img.crossOrigin = 'anonymous';

            const timeoutId = setTimeout(() => {
              console.warn('[PDF] Timeout loading image');
              resolve(null);
            }, 12000);

            img.onload = () => {
              clearTimeout(timeoutId);
              try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(null); return; }

                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);

                const dataUrl = canvas.toDataURL('image/png');
                console.log('[PDF] ✓ Image loaded:', img.naturalWidth, 'x', img.naturalHeight);
                resolve({ data: dataUrl, width: img.naturalWidth, height: img.naturalHeight });
              } catch (e: any) {
                console.warn('[PDF] Canvas error (tainted):', e.message);
                resolve(null);
              }
            };

            img.onerror = () => {
              clearTimeout(timeoutId);
              console.warn('[PDF] Image failed to load');
              resolve(null);
            };

            img.src = imgUrl;
          });
        };

        // Try 1: Direct load with crossOrigin (standard CORS approach)
        let result = await tryLoad(url, true);
        if (result) return result;

        // Try 2: Use fetch to get blob, then load from blob URL (bypasses some CORS issues)
        try {
          console.log('[PDF] Trying fetch approach...');
          const resp = await fetch(url);
          if (resp.ok) {
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            result = await tryLoad(blobUrl, false);
            URL.revokeObjectURL(blobUrl);
            if (result) return result;
          }
        } catch (e) {
          console.warn('[PDF] Fetch failed:', e);
        }

        console.warn('[PDF] Could not load image:', url);
        return null;
      };

      // Pre-fetch all images from the content
      console.log('[PDF] Pre-fetching images...');
      const imageCache: Map<string, { data: string; width: number; height: number }> = new Map();

      // Find all image references in the content
      const imageRegex = /!\[.*?\]\((.*?)\)/g;
      const imageMatches = Array.from(tutorialPayload.tutorial_content.matchAll(imageRegex));

      // Fetch each image and resolve asset IDs
      for (const match of imageMatches) {
        const imageRef = match[1]; // The asset ID or URL

        // Resolve the image URL
        let imageUrl = imageRef;

        // Check if it's an asset ID (not a full URL)
        if (!imageRef.startsWith('http') && !imageRef.startsWith('data:')) {
          // Look up in assets dictionary
          const asset = tutorialPayload.assets?.[imageRef];
          if (asset) {
            if (asset.type === 'url') {
              // Convert S3 URL to HTTP
              imageUrl = convertS3ToHttp(asset.data);
            } else {
              // Base64 data
              imageUrl = asset.data;
            }
          }
        }

        // Fetch the image
        const imageData = await fetchImageAsBase64(imageUrl);
        if (imageData) {
          imageCache.set(imageRef, imageData);
        }
      }

      console.log('[PDF] Pre-fetched', imageCache.size, 'images');

      // Add title
      console.log('[PDF] Adding title:', article.title);
      addWrappedText(article.title, 24, true, [30, 64, 175]); // Blue color
      y += 5;

      // Add metadata
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, y);
      y += 10;

      // Add horizontal line
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Parse and add content
      console.log('[PDF] Parsing tutorial content...');
      const content = tutorialPayload.tutorial_content;

      // Remove interactive-code tags and process content
      const cleanContent = content
        .replace(/<interactive-code>/g, '```')
        .replace(/<\/interactive-code>/g, '```');

      // Split into sections by headers and paragraphs
      const lines = cleanContent.split('\n');
      let inCodeBlock = false;
      let codeBlockContent = '';

      for (const line of lines) {
        // Handle code blocks
        if (line.trim().startsWith('```')) {
          if (inCodeBlock) {
            // End of code block - add it to PDF
            checkPageBreak(30);

            // Code block background
            const codeLines = codeBlockContent.split('\n');
            const codeHeight = Math.min(codeLines.length * 4 + 8, 100); // Cap height

            doc.setFillColor(241, 245, 249); // Light gray background
            doc.roundedRect(margin, y, contentWidth, codeHeight, 2, 2, 'F');

            // Code text
            doc.setFontSize(9);
            doc.setFont('courier', 'normal');
            doc.setTextColor(16, 185, 129); // Green text for code

            let codeY = y + 6;
            for (const codeLine of codeLines.slice(0, 20)) { // Limit lines shown
              if (codeY < y + codeHeight - 4) {
                const truncatedLine = codeLine.length > 80 ? codeLine.substring(0, 77) + '...' : codeLine;
                doc.text(truncatedLine, margin + 4, codeY);
                codeY += 4;
              }
            }

            y += codeHeight + 5;
            codeBlockContent = '';
            inCodeBlock = false;
          } else {
            // Start of code block
            inCodeBlock = true;
          }
          continue;
        }

        if (inCodeBlock) {
          codeBlockContent += line + '\n';
          continue;
        }

        // Handle headers
        if (line.startsWith('### ')) {
          checkPageBreak(15);
          y += 5;
          addWrappedText(line.replace('### ', ''), 14, true, [30, 41, 59]);
          y += 2;
        } else if (line.startsWith('## ')) {
          checkPageBreak(20);
          y += 8;
          addWrappedText(line.replace('## ', ''), 16, true, [30, 64, 175]);
          y += 3;
        } else if (line.startsWith('# ')) {
          checkPageBreak(25);
          y += 10;
          addWrappedText(line.replace('# ', ''), 20, true, [30, 64, 175]);
          y += 5;
        }
        // Handle horizontal rules
        else if (line.trim() === '---') {
          checkPageBreak(10);
          y += 5;
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y, pageWidth - margin, y);
          y += 5;
        }
        // Handle image references
        else if (line.includes('![') && line.includes('](')) {
          // Extract alt text and image reference
          const altMatch = line.match(/!\[(.*?)\]/);
          const srcMatch = line.match(/\]\((.*?)\)/);
          const altText = altMatch ? altMatch[1] : 'Image';
          const imageRef = srcMatch ? srcMatch[1] : '';

          // Try to get the image from cache
          const cachedImage = imageCache.get(imageRef);

          if (cachedImage) {
            // Calculate image dimensions to fit within content width
            const maxImageHeight = 80; // Max height in mm
            const aspectRatio = cachedImage.width / cachedImage.height;

            let imgWidth = contentWidth;
            let imgHeight = imgWidth / aspectRatio;

            // If too tall, scale down
            if (imgHeight > maxImageHeight) {
              imgHeight = maxImageHeight;
              imgWidth = imgHeight * aspectRatio;
            }

            // Center the image if it's narrower than content width
            const imgX = margin + (contentWidth - imgWidth) / 2;

            // Check page break for image
            checkPageBreak(imgHeight + 15);

            try {
              // Add the image (using PNG format for WebP compatibility)
              doc.addImage(cachedImage.data, 'PNG', imgX, y, imgWidth, imgHeight);
              y += imgHeight + 3;

              // Add caption below image
              doc.setFontSize(9);
              doc.setTextColor(100, 116, 139);
              doc.setFont('helvetica', 'italic');
              const captionLines = doc.splitTextToSize(altText, contentWidth);
              for (const captionLine of captionLines) {
                const captionWidth = doc.getTextWidth(captionLine);
                doc.text(captionLine, margin + (contentWidth - captionWidth) / 2, y);
                y += 4;
              }

              y += 8; // Gap after image
              console.log('[PDF] Added image:', altText);
            } catch (imgError) {
              console.warn('[PDF] Error adding image to PDF:', imgError);
              // Fall through to placeholder
            }
          } else {
            // Fallback: Add placeholder for image that couldn't be loaded
            checkPageBreak(45);

            doc.setFillColor(241, 245, 249);
            doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'F');

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'italic');
            const imgText = `[Image: ${altText}]`;
            const textWidthVal = doc.getTextWidth(imgText);
            doc.text(imgText, margin + (contentWidth - textWidthVal) / 2, y + 22);

            y += 45;
          }
        }
        // Handle bullet points
        else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          checkPageBreak(8);
          const bulletText = '• ' + line.trim().substring(2);
          addWrappedText(bulletText, 11, false);
        }
        // Handle numbered lists
        else if (/^\d+\.\s/.test(line.trim())) {
          checkPageBreak(8);
          addWrappedText(line.trim(), 11, false);
        }
        // Handle bold text in paragraphs
        else if (line.trim().length > 0) {
          checkPageBreak(8);
          // Remove markdown bold/italic markers for PDF
          const cleanLine = line
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`(.*?)`/g, '$1');
          addWrappedText(cleanLine, 11, false);
        }
        // Empty lines - add small gap
        else {
          y += 3;
        }
      }

      // Add footer on last page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${i} of ${totalPages} • Generated by Text2Block`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      console.log('[PDF] Saving PDF...');
      doc.save(filename);

      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`[ArticleView] PDF Generation Complete: Success in ${duration}s`);

    } catch (error: any) {
      console.error('[ArticleView] PDF Generation Failed:', error?.message);
      if (error?.stack) console.debug(error.stack);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Custom image renderer for ReactMarkdown that resolves asset IDs
  const customRenderers = {
    // Headings
    h1: ({ children }: any) => (
      <h1 className={`text-3xl md:text-4xl font-extrabold mb-6 mt-2 leading-tight tracking-tight
        ${isDark ? 'text-white' : 'bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-cyan-600'}
      `}>
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className={`text-2xl md:text-3xl font-bold mt-10 mb-4 pb-2 border-b
        ${isDark ? 'text-white border-white/10' : 'text-slate-800 border-slate-200'}
      `}>
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className={`text-xl md:text-2xl font-bold mt-8 mb-3
        ${isDark ? 'text-emerald-400' : 'text-blue-700'}
      `}>
        {children}
      </h3>
    ),
    
    // Paragraphs with better readability
    p: ({ children }: any) => (
      <p className={`mb-5 text-lg leading-8
        ${isDark ? 'text-slate-300' : 'text-slate-700'}
      `}>
        {children}
      </p>
    ),

    // Lists
    ul: ({ children }: any) => (
      <ul className={`list-disc pl-6 mb-6 space-y-2 text-lg
        ${isDark ? 'text-slate-300 marker:text-emerald-500' : 'text-slate-700 marker:text-blue-500'}
      `}>
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className={`list-decimal pl-6 mb-6 space-y-2 text-lg
        ${isDark ? 'text-slate-300 marker:text-cyan-500' : 'text-slate-700 marker:text-blue-600'}
      `}>
        {children}
      </ol>
    ),

    // Emphasis
    strong: ({ children }: any) => (
      <strong className={`font-bold
        ${isDark ? 'text-white' : 'text-slate-900'}
      `}>
        {children}
      </strong>
    ),
    
    // Blockquotes
    blockquote: ({ children }: any) => (
      <blockquote className={`pl-4 border-l-4 my-6 italic
        ${isDark ? 'border-emerald-500/50 text-slate-400 bg-slate-800/20 py-2 pr-2 rounded-r' : 'border-blue-500/50 text-slate-600 bg-blue-50/50 py-2 pr-2 rounded-r'}
      `}>
        {children}
      </blockquote>
    ),

    img: ({ src, alt }: { src?: string; alt?: string }) => {
      if (!src) return null;

      // Check if src is an asset ID (not a URL)
      const isAssetId = src && !src.startsWith('http') && !src.startsWith('data:');
      const resolvedSrc = isAssetId && tutorialPayload
        ? resolveAssetUrl(src, tutorialPayload.assets)
        : src;

      return (
        <figure className={`my-8 relative group text-center
          ${isDark ? '' : ''}`}
        >
          <div className={`relative inline-block rounded-xl overflow-hidden transition-all duration-300 group-hover:shadow-xl
            ${isDark
              ? 'bg-slate-800/50 border border-white/10 shadow-lg shadow-black/20'
              : 'bg-white border border-gray-200 shadow-lg shadow-gray-200/50'
            }`}
          >
            <img
              src={resolvedSrc}
              alt={alt || 'Tutorial image'}
              loading="lazy"
              onClick={() => resolvedSrc && setSelectedImage(resolvedSrc)}
              className="max-w-full max-h-[600px] w-auto h-auto mx-auto object-contain cursor-zoom-in transition-transform duration-500 group-hover:scale-[1.01]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Unavailable';
              }}
            />
            
            {/* Zoom overlay hint */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100">
               <div className="bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm shadow-sm border border-white/20">Click to zoom</div>
            </div>
          </div>
          
          {alt && (
            <figcaption className={`mt-3 px-5 text-sm font-medium
              ${isDark ? 'text-gray-400' : 'text-gray-500'}
            `}>
              {alt}
            </figcaption>
          )}
        </figure>
      );
    },
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full mx-auto mb-4" />
          <p className={textSecondary}>Loading tutorial...</p>
        </div>
      </div>
    );
  }

  if (!tutorialPayload || !tutorialPayload.tutorial_content) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className={textSecondary}>No tutorial content available</p>
          <button
            onClick={onNewTutorial}
            className={`mt-4 ${glassClass} px-4 py-2 rounded-lg border ${borderColor} ${hoverBorderClass} transition-colors ${textPrimary}`}
          >
            Create New Tutorial
          </button>
        </div>
      </div>
    );
  }

  // Parse the tutorial content
  const contentSegments = parseContent(tutorialPayload.tutorial_content, tutorialPayload.assets || {});
  const assetCount = Object.keys(tutorialPayload.assets || {}).length;
  console.log(`[ArticleView] Resolved ${assetCount} asset URLs`);



  // ... (existing code)

  return (
    <div ref={scrollContainerRef} className="relative">
      {/* Reading Progress Bar - Sticky at top (under navbar) */}
      <div className="sticky top-16 left-0 right-0 z-40">
        <div className={`h-1.5 ${isDark ? 'bg-slate-800/90 backdrop-blur' : 'bg-gray-100/90 backdrop-blur'}`}>
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-150 ease-out shadow-sm"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      </div>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 p-3 rounded-full shadow-lg transition-all duration-300 
          ${isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }
          ${showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
          hover:shadow-xl hover:-translate-y-1
        `}
        aria-label="Back to top"
      >
        <ChevronUp size={20} />
      </button>

      {/* Subtle background gradient for premium feel */}
      <div className={`min-h-full ${isDark ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950' : 'bg-gradient-to-b from-white via-gray-50/50 to-gray-100/30'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">

          {/* Breadcrumbs - Refined styling */}
          <nav className={`flex items-center gap-2 text-sm ${textSecondary} mb-8`}>
            <button
              onClick={onNewTutorial}
              className={`${hoverTextClass} transition-all duration-200 flex items-center gap-1.5 hover:scale-105`}
            >
              <Home size={14} />
              <span>Home</span>
            </button>
            <ChevronRight size={14} className="opacity-50" />
            <button
              onClick={onOpenSidebar}
              className={`${hoverTextClass} transition-all duration-200 hover:scale-105`}
            >
              History
            </button>
            <ChevronRight size={14} className="opacity-50" />
            <span className={`${textPrimary} truncate max-w-[200px] font-medium`}>
              {article.title}
            </span>
          </nav>

          {/* Action buttons - Enhanced with gradient borders */}
          <div className="flex flex-wrap items-center gap-3 mb-10">
            <button
              onClick={onNewTutorial}
              className={`relative group px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 
                ${isDark
                  ? 'bg-white/5 hover:bg-white/10 text-white/90 hover:text-white border border-white/10 hover:border-white/20'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300'
                } hover:shadow-lg hover:-translate-y-0.5`}
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
              New Tutorial
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className={`relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 
                ${isDark
                  ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 text-white/90 hover:text-white border border-blue-500/30 hover:border-blue-500/50'
                  : 'bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-blue-700 border border-blue-200 hover:border-blue-300'
                } hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none`}
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download PDF
                </>
              )}
            </button>
          </div>

          {/* Article Content */}
          <article ref={articleRef} className="article-content">

            {/* Title Section - Premium styling */}
            <header className="mb-12">
              {/* Decorative accent line */}
              <div className={`w-20 h-1 rounded-full mb-6 bg-gradient-to-r ${isDark ? 'from-blue-500 to-purple-500' : 'from-blue-600 to-purple-600'}`} />

              <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight tracking-tight ${textPrimary}`}>
                {article.title}
              </h1>

              {/* Metadata badges */}
              <div className="flex flex-wrap items-center gap-3 mb-8">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                  ${isDark ? 'bg-white/5 text-white/70 border border-white/10' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                  <Clock size={12} />
                  <span>{readTime}</span>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                  ${isDark ? 'bg-white/5 text-white/70 border border-white/10' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                  <Calendar size={12} />
                  <span>{formatRelativeTime(createdAt)}</span>
                </div>
              </div>

              {/* Divider with gradient */}
              <div className={`h-px bg-gradient-to-r ${isDark ? 'from-transparent via-white/20 to-transparent' : 'from-transparent via-gray-300 to-transparent'}`} />
            </header>

            {/* Render content segments with enhanced prose styling */}
            <div className={`prose prose-lg max-w-none 
              ${isDark ? 'prose-invert' : ''} 
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b ${isDark ? 'prose-h2:border-white/10' : 'prose-h2:border-gray-200'}
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:leading-relaxed prose-p:my-4
              prose-li:my-1
              prose-strong:${isDark ? 'text-white' : 'text-gray-900'}
              prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline
            `}>
              {contentSegments.map((segment, index) => {
                if (segment.type === 'code') {
                  return (
                    <InteractiveCodeBlock
                      key={index}
                      code={segment.content}
                      language={segment.language || 'text'}
                    />
                  );
                }

                return (
                  <div key={index} className={`${textPrimary} leading-relaxed`}>
                    <ReactMarkdown components={customRenderers}>
                      {segment.content}
                    </ReactMarkdown>
                  </div>
                );
              })}
            </div>

            {/* Key Takeaways - Premium card with gradient border */}
            <div className="relative mt-16 mb-16 md:mb-20">
              {/* Gradient border effect */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${isDark ? 'from-emerald-500/30 via-cyan-500/30 to-blue-500/30' : 'from-emerald-500/40 via-cyan-500/40 to-blue-500/40'} p-[1px]`}>
                <div className={`w-full h-full rounded-2xl ${isDark ? 'bg-slate-900' : 'bg-white'}`} />
              </div>

              {/* Content */}
              <div className="relative p-6 md:p-8">
                <h3 className={`text-xl font-bold mb-6 flex items-center gap-3 ${textPrimary}`}>
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white text-sm">
                    ✓
                  </span>
                  Key Takeaways
                </h3>
                <ul className="space-y-4">
                  <li className={`flex items-start gap-3 ${textPrimary}`}>
                    <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2.5 ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
                    <span className="leading-relaxed">Understanding core concepts is essential before implementation</span>
                  </li>
                  <li className={`flex items-start gap-3 ${textPrimary}`}>
                    <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2.5 ${isDark ? 'bg-cyan-400' : 'bg-cyan-500'}`} />
                    <span className="leading-relaxed">Visual diagrams help clarify complex system architectures</span>
                  </li>
                  <li className={`flex items-start gap-3 ${textPrimary}`}>
                    <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2.5 ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} />
                    <span className="leading-relaxed">Following best practices ensures maintainable, scalable code</span>
                  </li>
                </ul>
              </div>
            </div>

          </article>
        </div>
      </div>
      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[101]"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>
          <img 
            src={selectedImage} 
            alt="Full screen view" 
            className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain shadow-2xl rounded-sm select-none"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}