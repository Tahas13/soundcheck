/** Source of truth for the architecture diagram shown at /architecture (mirrors docs/architecture.mmd). */
export const ARCHITECTURE_MERMAID = `flowchart TB
  subgraph Users["Users"]
    ENG["AI engineer / agency"]
    CI["CI pipeline<br/>GitHub Actions"]
    OWNER["Business owner"]
  end
  subgraph Control["Soundcheck control plane"]
    UI["Web dashboard + Report Card<br/>Next.js · Keycloak auth"]
    API["API + run orchestrator<br/>FastAPI · Temporal / Celery + Redis"]
    SCN["Scenario & persona library<br/>LangGraph state machines"]
  end
  subgraph Sim["Synthetic caller simulation"]
    PERSONA["Persona LLM<br/>Qwen 2.5 / Llama 3.x on vLLM"]
    VOICE["Persona voice + acoustic stressors<br/>Kokoro · Piper · XTTS → audiomentations<br/>noise, accents, interruptions"]
    PIPE["Voice pipeline + phone bridge<br/>Pipecat / LiveKit Agents · Asterisk / FreeSWITCH"]
    STT["STT<br/>faster-whisper"]
  end
  subgraph Target["System under test"]
    AGENT["Customer's voice agent<br/>e.g. Hilda"]
    TOOLS["Agent tools / side effects<br/>POS · calendar · CRM · SMS"]
    KB["Business knowledge base<br/>menu, hours, policies"]
  end
  subgraph Eval["Evaluation layer"]
    SIDE["Side-effect verifier<br/>did the booking really land?"]
    GROUND["Grounding judge<br/>claims vs knowledge base"]
    RULES["Rule judges<br/>AI disclosure · PCI · escalation · injection"]
    TONE["Tone & empathy judge<br/>LLM-as-judge calibrated on human labels"]
    LAT["Latency & interruption metrics"]
    SCORE["Scorer + deploy gate<br/>weighted score · any critical fail = block"]
  end
  subgraph Prod["Production shadow monitor"]
    SAMPLER["Live call sampler"]
    DRIFT["Drift detection & failure clustering<br/>pgvector embeddings"]
    PROMOTE["Failure → regression scenario<br/>the flywheel"]
  end
  subgraph Data["Data & observability"]
    PG[("PostgreSQL + pgvector<br/>runs, verdicts, scenarios")]
    MINIO[("MinIO<br/>audio & transcripts")]
    LF["Langfuse<br/>traces & eval datasets"]
    PROM["Prometheus + Grafana<br/>latency SLOs"]
  end
  ENG --> UI --> API
  CI -->|"POST /runs on every PR"| API
  API --> SCN --> PERSONA
  PERSONA --> VOICE --> PIPE
  PIPE -->|"audio call or text/API mode"| AGENT
  AGENT -->|"agent speech"| STT
  STT -->|"next caller turn"| PERSONA
  AGENT --> TOOLS
  STT --> GROUND
  STT --> RULES
  STT --> TONE
  TOOLS -->|"tool-call log"| SIDE
  KB --> GROUND
  PIPE --> LAT
  SIDE --> SCORE
  GROUND --> SCORE
  RULES --> SCORE
  TONE --> SCORE
  LAT --> SCORE
  SCORE -->|"pass / block"| CI
  SCORE -->|"Report Card public link"| OWNER
  SCORE --> PG
  UI --> PG
  AGENT -.->|"sampled production calls"| SAMPLER
  SAMPLER --> STT
  SAMPLER --> DRIFT --> PROMOTE --> SCN
  API --> LF
  PIPE --> MINIO
  LAT --> PROM`;
