import { MessageCircle, Code2, Search, Map, BarChart2 } from 'lucide-react';

export const AGENT_CONFIG = {
  GENERAL:         { label: "Chat",     color: "#7F77DD", bg: "#EEEDFE", icon: MessageCircle, path: "/workspace" },
  CODE_RESEARCHER: { label: "Code",     color: "#1D9E75", bg: "#E1F5EE", icon: Code2,         path: "/workspace/code" },
  RESEARCH:        { label: "Research", color: "#378ADD", bg: "#E6F1FB", icon: Search,        path: "/workspace/research" },
  PLAN:            { label: "Plan",     color: "#D85A30", bg: "#FAECE7", icon: Map,           path: "/workspace/plan" },
  ANALYZE:         { label: "Analyze",  color: "#D4537E", bg: "#FBEAF0", icon: BarChart2,     path: "/workspace/analyze" },
};
