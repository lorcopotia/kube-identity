# KubeIdentity

KubeIdentity is a high-performance, real-time Kubernetes RBAC (Role-Based Access Control) generator designed to help cluster administrators manage permissions with precision and ease.

## Purpose

Managing Kubernetes permissions can be complex and error-prone. KubeIdentity provides a visual and interactive interface to:
- Generate **ServiceAccounts**, **Roles**, and **RoleBindings**.
- Support for both **Namespace-scoped** and **Cluster-wide** (ClusterRole) permissions.
- **Real-time manifest generation**: See your YAML manifests update instantly as you configure rules.
- **Security Audit**: Integrated logic to ensure your configurations comply with the **Principle of Least Privilege**.
- **Interactive UI**: A modern, bento-style dashboard with support for dark mode.

## Features

- **Resource Selection**: Easily pick from common Kubernetes resources (Pods, Deployments, Secrets, etc.).
- **Verb Mapping**: Map specific verbs (get, list, watch, create, etc.) to your rules.
- **Metadata Management**: Add custom labels and maintain standard naming conventions.
- **One-click Export**: Copy generated YAML directly to your clipboard for deployment.
- **Theme Support**: Seamlessly switch between light and dark modes for the best editing experience.

## Usage

1. **Identity Type**: Select whether you are creating a simple ServiceAccount or just the Role/Binding.
2. **Basic Config**: Set your application name, namespace, and role details.
3. **Labels**: Add necessary metadata labels.
4. **Permissions**: Define the API groups, resources, and verbs allowed.
5. **Review**: Check the visual YAML manifest and security audit insights.
6. **Deploy**: Use the "Copy" button and apply the manifest to your cluster using `kubectl apply -f`.

---
Built for Kubernetes Administrators who value speed, security, and clean YAML.
