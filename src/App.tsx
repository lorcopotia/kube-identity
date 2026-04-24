/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Users, 
  ShieldCheck, 
  Copy, 
  Check, 
  Download, 
  Plus, 
  Trash2, 
  Layers,
  Settings,
  Code as CodeIcon,
  Terminal,
  FileCode
} from "lucide-react";
import yaml from "js-yaml";

type IdentityType = "ServiceAccount" | "User" | "Group";

interface Label {
  id: string;
  key: string;
  value: string;
}

interface Rule {
  id: string;
  apiGroups: string;
  resources: string;
  verbs: string;
}

interface IdentityState {
  type: IdentityType;
  name: string;
  namespace: string;
  labels: Label[];
  roleName: string;
  isClusterRole: boolean;
  rules: Rule[];
}

export default function App() {
  const [state, setState] = useState<IdentityState>({
    type: "ServiceAccount",
    name: "my-service-account",
    namespace: "default",
    labels: [{ id: "1", key: "app.kubernetes.io/name", value: "identity-creator" }],
    roleName: "my-custom-role",
    isClusterRole: false,
    rules: [{ id: "1", apiGroups: "", resources: "pods,services", verbs: "get,list,watch" }],
  });

  const [copied, setCopied] = useState(false);

  const generateYaml = useMemo(() => {
    const documents: any[] = [];

    // Labels object
    const labelsObj = state.labels.reduce((acc, l) => {
      if (l.key.trim()) acc[l.key] = l.value;
      return acc;
    }, {} as any);

    // 1. ServiceAccount (only if type is ServiceAccount)
    if (state.type === "ServiceAccount") {
      documents.push({
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: state.name,
          namespace: state.namespace,
          ...(Object.keys(labelsObj).length > 0 ? { labels: labelsObj } : {}),
        },
      });
    }

    // 2. Role or ClusterRole (if rules exist)
    if (state.rules.length > 0) {
      const roleKind = state.isClusterRole ? "ClusterRole" : "Role";
      const rules = state.rules.map(r => ({
        apiGroups: r.apiGroups ? r.apiGroups.split(",").map(s => s.trim()) : [""],
        resources: r.resources.split(",").map(s => s.trim()).filter(Boolean),
        verbs: r.verbs.split(",").map(s => s.trim()).filter(Boolean),
      }));

      documents.push({
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: roleKind,
        metadata: {
          name: state.roleName,
          ...(!state.isClusterRole ? { namespace: state.namespace } : {}),
        },
        rules: rules,
      });
    }

    // 3. RoleBinding or ClusterRoleBinding
    const bindingKind = state.isClusterRole ? "ClusterRoleBinding" : "RoleBinding";
    const roleKind = state.isClusterRole ? "ClusterRole" : "Role";
    
    const bindingName = `${state.name}-${state.roleName}-binding`;

    const subject: any = {
      kind: state.type,
      name: state.name,
    };

    if (state.type === "ServiceAccount") {
      subject.namespace = state.namespace;
    } else if (state.type === "User" || state.type === "Group") {
      subject.apiGroup = "rbac.authorization.k8s.io";
    }

    documents.push({
      apiVersion: "rbac.authorization.k8s.io/v1",
      kind: bindingKind,
      metadata: {
        name: bindingName,
        ...(!state.isClusterRole ? { namespace: state.namespace } : {}),
      },
      subjects: [subject],
      roleRef: {
        kind: roleKind,
        name: state.roleName,
        apiGroup: "rbac.authorization.k8s.io",
      },
    });

    return documents.map(doc => yaml.dump(doc, { indent: 2, noRefs: true })).join("---\n");
  }, [state]);

  const kubectlCommand = useMemo(() => {
    const bindingType = state.isClusterRole ? "clusterrolebinding" : "rolebinding";
    const roleType = state.isClusterRole ? "clusterrole" : "role";
    const subjectPrefix = state.type === "ServiceAccount" ? "serviceaccount" : state.type.toLowerCase();
    const subjectValue = state.type === "ServiceAccount" ? `${state.namespace}:${state.name}` : state.name;
    
    const namespaceFlag = !state.isClusterRole ? ` -n ${state.namespace}` : "";
    
    return `kubectl create ${bindingType} ${state.name}-${state.roleName}-binding --${roleType}=${state.roleName} --${subjectPrefix}=${subjectValue}${namespaceFlag}`;
  }, [state]);

  const securityInsights = useMemo(() => {
    const warnings: string[] = [];
    state.rules.forEach((rule, idx) => {
      const verbs = rule.verbs.split(",").map(v => v.trim());
      const resources = rule.resources.split(",").map(r => r.trim());
      
      if (verbs.includes("*")) {
        warnings.push(`Rule #${idx + 1}: Using '*' in verbs is dangerous. Consider specifying only 'get', 'list', etc.`);
      }
      if (resources.includes("*")) {
        warnings.push(`Rule #${idx + 1}: Access to all resources ('*') is very broad.`);
      }
    });
    return warnings;
  }, [state.rules]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generateYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addLabel = () => {
    setState(s => ({
      ...s,
      labels: [...s.labels, { id: Math.random().toString(), key: "", value: "" }]
    }));
  };

  const updateLabel = (id: string, field: "key" | "value", value: string) => {
    setState(s => ({
      ...s,
      labels: s.labels.map(l => l.id === id ? { ...l, [field]: value } : l)
    }));
  };

  const removeLabel = (id: string) => {
    setState(s => ({
      ...s,
      labels: s.labels.filter(l => l.id !== id)
    }));
  };

  const addRule = () => {
    setState(s => ({
      ...s,
      rules: [...s.rules, { id: Math.random().toString(), apiGroups: "", resources: "", verbs: "" }]
    }));
  };

  const updateRule = (id: string, field: keyof Rule, value: string) => {
    setState(s => ({
      ...s,
      rules: s.rules.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  const removeRule = (id: string) => {
    setState(s => ({
      ...s,
      rules: s.rules.filter(r => r.id !== id)
    }));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-bento-bg text-bento-text-main font-sans selection:bg-bento-accent/20">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto h-full grid grid-cols-1 md:grid-cols-[320px_1fr_400px] gap-5"
      >
        {/* SIDEBAR / LOGO & TYPE SELECTION */}
        <motion.aside 
          variants={itemVariants}
          className="md:row-span-4 bg-bento-card rounded-[24px] p-8 border border-bento-border flex flex-col shadow-sm"
        >
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-bento-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-bento-accent/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">KubeIdentity</h1>
              <p className="text-[10px] text-bento-text-sec uppercase tracking-widest font-bold">RBAC Builder</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-bento-text-sec font-bold">Identity Type</label>
              <div className="grid grid-cols-1 gap-2">
                {(["ServiceAccount", "User", "Group"] as IdentityType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setState(s => ({ ...s, type }))}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm font-semibold transition-all ${
                      state.type === type 
                        ? "bg-bento-accent text-white shadow-md shadow-bento-accent/20" 
                        : "bg-[#f0f0f2] text-bento-text-sec hover:bg-gray-200"
                    }`}
                  >
                    {type === "ServiceAccount" && <Layers className="w-4 h-4" />}
                    {type === "User" && <User className="w-4 h-4" />}
                    {type === "Group" && <Users className="w-4 h-4" />}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-bento-border space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-bento-text-sec">
                <span>NAMESPACE</span>
                <span className="text-bento-accent font-mono">{state.namespace}</span>
              </div>
              <input
                type="text"
                value={state.namespace}
                onChange={(e) => setState(s => ({ ...s, namespace: e.target.value }))}
                className="w-full bg-[#f5f5f7] border border-bento-border p-3 rounded-xl text-sm focus:ring-2 focus:ring-bento-accent/20 focus:outline-none"
                placeholder="namespace..."
              />
            </div>
          </div>

          <div className="mt-auto pt-6">
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Live Engine</span>
              </div>
              <p className="text-[11px] text-emerald-600/80 leading-relaxed font-medium">Manifests are generated in real-time as you type.</p>
            </div>
          </div>
        </motion.aside>

        {/* MAIN EDITOR HERO */}
        <motion.section 
          variants={itemVariants}
          className="md:col-span-2 bg-gradient-to-br from-white to-neutral-50 rounded-[24px] p-8 md:p-10 border border-bento-border shadow-sm flex flex-col"
        >
          <div className="mb-10">
            <span className="text-[11px] uppercase tracking-widest text-bento-text-sec font-bold mb-3 block">Basic Configuration</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-sm font-bold text-bento-text-main flex items-center gap-2">
                  Name <span className="text-bento-accent text-xs">*</span>
                </label>
                <input
                  type="text"
                  value={state.name}
                  onChange={(e) => setState(s => ({ ...s, name: e.target.value }))}
                  className="w-full bg-white border border-bento-border p-4 rounded-2xl text-lg font-medium shadow-sm transition-all focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent focus:outline-none"
                  placeholder="e.g. build-bot"
                />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-bold text-bento-text-main flex items-center justify-between">
                  <span>Role Attribution</span>
                  <span className="text-[10px] text-bento-text-sec italic font-normal">
                    {state.isClusterRole 
                      ? "ClusterRole: Shared across the whole cluster." 
                      : "Role: Limited to the namespace."}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={state.roleName}
                    onChange={(e) => setState(s => ({ ...s, roleName: e.target.value }))}
                    className="flex-1 bg-white border border-bento-border p-4 rounded-2xl text-lg font-medium shadow-sm transition-all focus:ring-4 focus:ring-bento-accent/10 focus:border-bento-accent focus:outline-none font-mono"
                    placeholder="view..."
                  />
                  <button
                    onClick={() => setState(s => ({ ...s, isClusterRole: !s.isClusterRole }))}
                    className={`px-4 rounded-2xl font-bold text-[10px] uppercase tracking-tighter transition-all border ${
                      state.isClusterRole 
                        ? "bg-bento-text-main text-white border-bento-text-main" 
                        : "bg-white text-bento-text-sec border-bento-border hover:bg-neutral-50"
                    }`}
                  >
                    Cluster
                  </button>
                </div>
                <p className="text-[10px] text-bento-text-sec leading-tight">
                  <span className="font-bold text-bento-accent">Scope Guide:</span> Use <b>Role</b> for specific resources within a namespace (e.g., pods in 'default'). Use <b>ClusterRole</b> for nodes, namespaces, or shared cluster-wide resources.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-10">
            {/* Metadata Labels Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-widest text-bento-text-sec font-bold">Metadata Labels</span>
                <button 
                  onClick={addLabel}
                  className="text-[11px] uppercase tracking-widest text-bento-accent font-bold flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Label
                </button>
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {state.labels.map((l) => (
                    <motion.div 
                      key={l.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex gap-3 group"
                    >
                      <input
                        type="text"
                        value={l.key}
                        onChange={(e) => updateLabel(l.id, "key", e.target.value)}
                        placeholder="key"
                        className="flex-1 bg-white/50 border border-bento-border p-3 rounded-xl text-sm focus:ring-2 focus:ring-bento-accent/20 focus:outline-none font-mono"
                      />
                      <input
                        type="text"
                        value={l.value}
                        onChange={(e) => updateLabel(l.id, "value", e.target.value)}
                        placeholder="value"
                        className="flex-1 bg-white/50 border border-bento-border p-3 rounded-xl text-sm focus:ring-2 focus:ring-bento-accent/20 focus:outline-none font-mono"
                      />
                      <button 
                        onClick={() => removeLabel(l.id)}
                        className="p-3 text-bento-text-sec hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {state.labels.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed border-bento-border rounded-2xl">
                    <p className="text-xs text-bento-text-sec font-medium">No labels added yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Permissions Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-widest text-bento-text-sec font-bold">Permissions (Rules)</span>
                <button 
                  onClick={addRule}
                  className="text-[11px] uppercase tracking-widest text-bento-accent font-bold flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Rule
                </button>
              </div>
              <div className="space-y-4">
                <AnimatePresence>
                  {state.rules.map((r, idx) => (
                    <motion.div 
                      key={r.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white/40 p-5 rounded-2xl border border-bento-border relative group"
                    >
                      <button 
                        onClick={() => removeRule(r.id)}
                        className="absolute top-4 right-4 p-2 text-bento-text-sec hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-bold text-bento-text-sec/40 absolute top-4 left-4">RULE #{idx + 1}</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-bento-text-sec">API GROUPS</label>
                          <input
                            type="text"
                            value={r.apiGroups}
                            onChange={(e) => updateRule(r.id, "apiGroups", e.target.value)}
                            placeholder='(e.g., "", "apps")'
                            className="w-full bg-white border border-bento-border p-2.5 rounded-xl text-xs font-mono focus:ring-2 focus:ring-bento-accent/20 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-bento-text-sec">RESOURCES</label>
                          <input
                            type="text"
                            value={r.resources}
                            onChange={(e) => updateRule(r.id, "resources", e.target.value)}
                            placeholder="pods, deployments..."
                            className="w-full bg-white border border-bento-border p-2.5 rounded-xl text-xs font-mono focus:ring-2 focus:ring-bento-accent/20 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-bento-text-sec">VERBS</label>
                          <input
                            type="text"
                            value={r.verbs}
                            onChange={(e) => updateRule(r.id, "verbs", e.target.value)}
                            placeholder="get, list, watch..."
                            className="w-full bg-white border border-bento-border p-2.5 rounded-xl text-xs font-mono focus:ring-2 focus:ring-bento-accent/20 focus:outline-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {state.rules.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed border-bento-border rounded-2xl">
                    <p className="text-xs text-bento-text-sec font-medium">No permissions defined. Binding to an existing reference.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* YAML PREVIEW SECTION */}
        <motion.section 
          variants={itemVariants}
          className="md:row-span-4 bg-bento-card rounded-[24px] border border-bento-border shadow-sm flex flex-col overflow-hidden"
        >
          <div className="p-5 border-b border-bento-border flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-bento-text-sec" />
              <span className="text-[11px] uppercase tracking-widest text-bento-text-sec font-bold">YAML Manifest</span>
            </div>
            <button 
              onClick={handleCopy}
              className="p-2 bg-white border border-bento-border rounded-lg shadow-sm font-bold text-[10px] flex items-center gap-1.5 transition-all active:scale-95 uppercase tracking-tight"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-bento-text-sec" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex-1 bg-[#1a1b26] overflow-auto p-6 font-mono text-[12px] leading-relaxed relative">
            <div className="absolute top-4 right-4 group">
              <div className="w-2 h-2 bg-bento-accent rounded-full shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
            </div>
            <pre className="text-[#a9b1d6] whitespace-pre-wrap">
              {generateYaml}
            </pre>
          </div>
        </motion.section>

        {/* BOTTOM QUICK ACTIONS / INFO */}
        <motion.section 
          variants={itemVariants}
          className="md:col-span-1 bg-neutral-900 text-white rounded-[24px] p-6 border border-zinc-800 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-500" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">CLI Command</span>
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(kubectlCommand)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-black/50 p-4 rounded-xl text-[11px] text-zinc-400 border border-zinc-700/50 block mb-4 font-mono break-all leading-relaxed">
            {kubectlCommand}
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed italic">
            Command to create the binding without applying the full YAML.
          </p>
        </motion.section>

        <motion.section 
          variants={itemVariants}
          className="md:col-span-1 bg-bento-card rounded-[24px] p-6 px-8 border border-bento-border shadow-sm flex flex-col justify-center"
        >
          <div className="flex items-center gap-4 mb-3">
            <ShieldCheck className={`w-6 h-6 ${securityInsights.length > 0 ? "text-amber-500" : "text-emerald-500"}`} />
            <div>
              <p className="text-xs font-bold uppercase tracking-tight">Security Audit</p>
              <p className="text-[10px] text-bento-text-sec">
                {securityInsights.length > 0 
                  ? "Potential vulnerabilities found." 
                  : "Manifest validated successfully."}
              </p>
            </div>
          </div>
          {securityInsights.length > 0 && (
            <div className="space-y-1">
              {securityInsights.map((insight, i) => (
                <p key={i} className="text-[9px] text-amber-600 font-medium leading-tight bg-amber-50 p-1.5 rounded-lg border border-amber-100 italic">
                  {insight}
                </p>
              ))}
            </div>
          )}
          {securityInsights.length === 0 && (
            <div className="mt-2 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
              <p className="text-[9px] text-emerald-700 font-medium leading-tight">
                Complies with the <b>Principle of Least Privilege</b>.
              </p>
            </div>
          )}
        </motion.section>
      </motion.div>

      {/* FOOTER NAV / SETTINGS */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-bento-border rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-6 md:gap-10">
        <button className="flex flex-col items-center gap-1 group">
          <Layers className="w-5 h-5 text-bento-accent" />
          <span className="text-[9px] font-bold uppercase tracking-tighter text-bento-accent">Editor</span>
        </button>
        <button className="flex flex-col items-center gap-1 group opacity-40 hover:opacity-100 transition-opacity">
          <CodeIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Raw View</span>
        </button>
        <div className="w-px h-6 bg-bento-border" />
        <button className="flex flex-col items-center gap-1 group opacity-40 hover:opacity-100 transition-opacity">
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Settings</span>
        </button>
      </div>
    </div>
  );
}
