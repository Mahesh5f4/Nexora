import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_URL = 'https://thinkactionai.netlify.app';

export default function SEO({
  title = 'ThinkAction AI — Agentic AI Workspace',
  description = 'ThinkAction AI is an agentic AI workspace combining multi-agent reasoning, iterative evidence evaluation, persistent vector memory, repository intelligence, and enterprise RAG.',
  keywords = 'AI agent, agentic workflow, LangGraph, RAG, vector memory, AI research, codebase intelligence, ThinkAction AI',
  image = `${BASE_URL}/logo.png`,
  type = 'website'
}) {
  const location = useLocation();
  const canonicalUrl = `${BASE_URL}${location.pathname}`;

  useEffect(() => {
    // 1. Update Title
    document.title = title.includes('ThinkAction') ? title : `${title} | ThinkAction AI`;

    // 2. Update Meta Tags Helper
    const setMetaTag = (nameAttr, key, content) => {
      let element = document.querySelector(`meta[${nameAttr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Standard Meta
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'keywords', keywords);

    // Open Graph / Facebook / LinkedIn
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', image);
    setMetaTag('property', 'og:type', type);

    // Twitter Card
    setMetaTag('property', 'twitter:title', title);
    setMetaTag('property', 'twitter:description', description);
    setMetaTag('property', 'twitter:url', canonicalUrl);
    setMetaTag('property', 'twitter:image', image);

    // Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);
  }, [title, description, keywords, image, type, canonicalUrl]);

  return null;
}
