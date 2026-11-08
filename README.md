# NexusDC — Autonomous Data Center Spatial Digital Twin & Cascading-Failure Command Engine

**HackUTD Tracks:**
1. **CBRE (`The Invisible Network`):** Connects fragmented commercial real estate data (Physical Access Control, HVAC Chiller Loops, Utility Substations, GPU Compute Clusters, Tenant Lease SLA Contracts, and Commercial Real Estate Site Expansion) to predict and sever cascading operational failures before catastrophe strikes.
2. **NorthMark Compute & Cloud (`NMC² — Keep the World Running`):** Unsupervised Spectral Rack Clustering separating recoverable facility cooling cascades from chronic hardware degradation requiring physical blade/PSU/manifold replacement (`RACK-11, 12, 19, 20, 27`), paired with a **Zero-Drop Shift Handoff Flight Recorder**.
3. **NVIDIA (`Use Nemotron Beyond a Chatbot`):** Powered by `nvidia/nvidia-nemotron-nano-9b-v2` with `/think` reasoning traces, orchestrating a 4-Agent **ReAct (`Reason -> Act -> Observe`) + Tool-Calling** pipeline and **Agentic RAG** over unstructured shift logs and CBRE SLA leases.

---

## Quick Start for Teammates

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/shriya-1203/hackutd2027.git
cd hackutd2027
npm install
```

### 2. Configure Your NVIDIA Nemotron API Key
Copy `.env.example` to `.env.local` and paste our team's `nvapi-...` key from [build.nvidia.com](https://build.nvidia.com):
```bash
cp .env.example .env.local
```
Inside `.env.local`:
```env
NVIDIA_API_KEY=nvapi-your-key-here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NEMOTRON_MODEL=nvidia/nvidia-nemotron-nano-9b-v2
```
*(You can also paste the `nvapi-...` key directly into the UI header inside the app at any time!)*

### 3. Run the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.
