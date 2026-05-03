# Pulsar MCP Integration – Development Log

## 1. Scopo del documento

Questo file serve come **registro operativo persistente** per lo sviluppo del progetto:

**Integrazione MCP + LLM nel Pulsar Editor**

basata sul fork del repository:

```
drunnells/pulsar-edit-mcp-server
```

Il documento **NON fa parte del repository software**.

Serve invece per:

* mantenere **continuità tra sessioni di sviluppo**
* tracciare decisioni architetturali
* registrare modifiche effettuate
* fornire un **prompt di ripartenza** per la sessione successiva

Ad ogni nuova sessione questo file verrà fornito come contesto.

---

# 2. Procedura operativa tra sessioni

Poiché lo sviluppo avverrà in **più sessioni ChatGPT**, la procedura standard sarà la seguente.

### All’inizio di ogni nuovo step

Verranno sempre forniti:

1️⃣ **Il file `PULSAR_MCP_DEV_LOG.md` aggiornato**
2️⃣ **Lo ZIP completo dell'intero repository del fork**

Formato:

```
repository_name.zip
```

Questo permetterà di:

* analizzare **sempre lo stato reale del codice**
* evitare perdita di contesto tra sessioni
* lavorare su una **snapshot coerente del progetto**

Regola operativa:

> Ogni step inizia con l'upload dello ZIP aggiornato del repository.

---

# 3. Obiettivo del progetto

Trasformare il proof-of-concept:

```
pulsar-edit-mcp-server
```

in un **plugin Pulsar maturo** che consenta ad un LLM di:

* leggere codice nel workspace
* analizzare file
* proporre modifiche
* applicare patch controllate
* interagire tramite chat con l’editor

utilizzando il protocollo:

**Model Context Protocol (MCP)**

L’obiettivo finale è ottenere un **AI coding assistant integrato in Pulsar**.

---

# 4. Motivazione tecnica della scelta MCP

Sono stati valutati due approcci:

### Opzione A

Plugin Pulsar → chiamate dirette API LLM

### Opzione B

Plugin Pulsar → MCP server → LLM client

Decisione presa:

**Approccio B — MCP**

Motivazioni:

* interoperabilità tra modelli
* riduzione vendor lock-in
* compatibilità futura con agent framework
* architettura più scalabile
* integrazione con ecosistemi AI emergenti

Strategia:

> Implementazione iniziale semplice, ma architettura target MCP-first.

---

# 5. Repository di partenza

Fork utilizzato:

```
drunnells/pulsar-edit-mcp-server
```

Questo repository è:

* proof-of-concept
* incompleto
* sperimentale

ma dimostra la fattibilità della pipeline:

```
Pulsar package
     ↓
MCP server
     ↓
LLM client
```

Pertanto verrà usato come **base tecnica iniziale**.

---

# 6. Architettura target del plugin

L’architettura prevista separa chiaramente i seguenti layer.

```
┌───────────────────────────────┐
│ Pulsar UI Layer               │
│ chat panel / diff preview     │
└──────────────┬────────────────┘
               │
┌──────────────▼────────────────┐
│ Editor Command Layer          │
│ open file / edit / save       │
└──────────────┬────────────────┘
               │
┌──────────────▼────────────────┐
│ MCP Server Layer              │
│ tools + protocol              │
└──────────────┬────────────────┘
               │
┌──────────────▼────────────────┐
│ Model Provider Adapter        │
│ OpenAI / local LLM / others   │
└───────────────────────────────┘
```

Questa separazione garantisce:

* modularità
* compatibilità futura
* facilità di estensione

---

# 7. Livelli di maturità previsti

## Livello 1 — Usabile

* installazione plugin
* configurazione modello
* chat funzionante
* strumenti MCP base
* logging chiaro

Tool minimi:

* open_file
* read_selection
* replace_range
* save_file

---

## Livello 2 — Robusto

* timeout e retry
* validazione schema tool
* gestione conflitti file
* protezione prompt injection
* conferma operazioni distruttive

---

## Livello 3 — Maturo

* test automatici
* packaging stabile
* documentazione completa
* compatibilità multipli client MCP
* UX completa con preview diff

---

# 8. Rischi tecnici identificati

### Tool MCP troppo permissivi

Esporre troppe capacità al modello può generare modifiche imprevedibili.

Approccio:

> pochi tool ben definiti.

---

### UX editoriale

Il plugin dovrà includere:

* preview diff
* apply/reject
* cronologia azioni

---

### Sicurezza

Separazione obbligatoria tra:

* proposta modifica
* applicazione modifica

---

### Evoluzione MCP

Il protocollo MCP è ancora giovane.

Si adotterà un:

**adapter layer**

per evitare refactor profondi futuri.

---

# 9. Piano di lavoro

Il progetto sarà sviluppato in quattro fasi.

---

# FASE A — Audit del repository

Obiettivo:

analizzare il fork e comprendere struttura e qualità del codice.

---

## A.1 — Creazione e analisi checklist tecnica di revisione

Prima di analizzare il repository verrà creata una **checklist tecnica di revisione** con circa **20 controlli mirati**.

Questa checklist servirà per valutare:

* struttura progetto
* dipendenze
* separazione architetturale
* implementazione MCP
* integrazione Pulsar
* qualità codice

La checklist verrà poi applicata sistematicamente durante l'audit.

### Checklist tecnica definita

La checklist di audit viene fissata nei seguenti controlli.

#### 1) Struttura generale del progetto

1. Repository layout chiaro e coerente  
2. Entry point del package ben definito  
3. Separazione tra bootstrap, runtime e business logic  
4. Presenza di file legacy o scaffold non più coerenti  

#### 2) Package Pulsar e lifecycle

5. Lifecycle Pulsar corretto (`activate`, `deactivate`, `serialize`)  
6. Commands, menus e keymaps coerenti con le feature reali  
7. Apertura e gestione pannello UI corretta  
8. Status bar integration pulita  

#### 3) Architettura MCP

9. Avvio server MCP separato e controllabile  
10. Gestione sessioni MCP corretta  
11. Registrazione tool MCP organizzata e scalabile  
12. Contratti tool chiari e coerenti  
13. Compatibilità MCP futura / adapter readiness  

#### 4) Tooling editor e sicurezza operativa

14. Tool di lettura sufficientemente sicuri e precisi  
15. Tool di scrittura troppo permissivi o poco protetti  
16. Separazione tra proposta modifica e applicazione modifica  
17. Preview diff e highlighting affidabili  

#### 5) Chat integrata e layer LLM

18. Separazione tra UI chat, orchestrazione tool e provider LLM  
19. Gestione robusta di errori, timeout e stato conversazionale  
20. Sicurezza applicativa lato chat/HTML/rendering  

### Regola di tracciamento per i prossimi step

Per tutta la Fase A e per i successivi interventi di revisione dovrà essere mantenuto **sempre** il seguente schema operativo di tabella.

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 01 | Repository layout chiaro | OK / PARZIALE / CRITICO / DA RISCRIVERE | file e moduli coinvolti | Basso / Medio / Alto | tenere / rifattorizzare / isolare / riscrivere |

Questo schema va conservato come formato standard per tutte le prossime analisi.

### Esito della prima analisi preliminare del repository

Dalla prima ispezione dello ZIP emergono già i seguenti punti strutturali.

#### Evidenze preliminari emerse

* `lib/pulsar-edit-mcp-server.js` concentra bootstrap package, server Express/MCP, session handling, bootstrap client MCP, status bar e apertura del chat panel.
* `lib/chat-functions.js` miscela stato conversazionale, fetch modelli, chiamate API OpenAI-compatible, tool loop e aggiornamento UI.
* `lib/mcp-registration.js` è il nucleo funzionale principale ma ha già una forma monolitica.
* i tool di editing risultano orientati ad applicare modifiche direttamente al buffer/editor.
* nelle spec sono presenti riferimenti legacy al comando `pulsar-edit-mcp-server:toggle`, mentre il package espone `pulsar-edit-mcp-server:listen`.
* il repository resta comunque abbastanza compatto da consentire un audit completo senza dispersione.

#### Valutazione preliminare per macro-area

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 02 | Entry point del package ben definito | PARZIALE | `lib/pulsar-edit-mcp-server.js` è un bootstrap molto denso | Alto | rifattorizzare |
| 03 | Separazione bootstrap/runtime/business logic | CRITICO | responsabilità miste nello stesso modulo | Alto | separare |
| 06 | Commands, menus e keymaps coerenti | PARZIALE | mismatch tra comando reale e spec legacy | Medio | riallineare |
| 09 | Avvio server MCP separato e controllabile | CRITICO | server creato nel package runtime | Alto | isolare |
| 11 | Registrazione tool MCP organizzata e scalabile | PARZIALE | `lib/mcp-registration.js` tende al monolite | Medio | modularizzare |
| 15 | Tool di scrittura poco protetti | CRITICO | scritture dirette nel buffer | Alto | hardening |
| 16 | Separazione proposta/applicazione modifica | CRITICO | non emerge un vero gate di approvazione | Alto | introdurre workflow a due step |
| 18 | Separazione UI chat / orchestrazione / provider | CRITICO | `lib/chat-functions.js` è fortemente accoppiato | Alto | separare layer |
| 19 | Errori, timeout e stato conversazionale | PARZIALE | struttura presente ma non ancora robusta | Medio | rafforzare |
| 20 | Sicurezza chat/rendering | PARZIALE | sanitizzazione presente ma da verificare end-to-end | Medio | verificare |

### Priorità di lavoro emerse dalla prima analisi

Ordine operativo iniziale:

1. **separazione dell’entry point**
2. **hardening dei tool di scrittura**
3. **coerenza lifecycle Pulsar / comandi / spec**
4. **disaccoppiamento chat UI ↔ orchestrazione LLM ↔ provider**
5. **preparazione di un adapter layer MCP/provider**

### Primo passo di analisi e revisione predisposto

Il primo intervento dovrà concentrarsi sulla priorità n. 1:

**separazione dell’entry point del package**

#### Obiettivo tecnico del primo intervento

Ridurre il ruolo di `lib/pulsar-edit-mcp-server.js` a puro coordinatore del package, estraendo le responsabilità principali in moduli dedicati.

#### Analisi mirata da eseguire

* censire tutte le responsabilità presenti nell’entry point
* distinguere responsabilità di package lifecycle, UI, status bar, MCP server, MCP client e config
* identificare side effect a load time
* definire i confini minimi dei nuovi moduli

#### Prime fix strutturali candidate

* estrazione del bootstrap server MCP in un modulo dedicato
* estrazione del bootstrap client MCP in un modulo dedicato
* isolamento della gestione status bar
* riduzione della logica dentro `activate()` e `listenToggle()`
* lettura configurazione spostata dove possibile nel runtime e non nel top-level del modulo
* preparazione di interfacce minime tra package entry point e runtime MCP

#### Deliverable atteso del primo intervento

* mappa delle responsabilità dell’entry point
* proposta di scomposizione in moduli
* prima implementazione delle estrazioni strutturali a basso rischio
* verifica che attivazione/disattivazione del package continui a funzionare

---

## A.2 — Mappatura struttura del progetto

Analisi:

* directory
* file principali
* entry points
* organizzazione moduli

Nota operativa:

questa attività verrà eseguita usando la checklist sopra e riportando i risultati con lo **schema tabellare standard** definito in A.1.

### A.2.a — Analisi mirata dell’entry point e prime fix strutturali

Obiettivo eseguito:

analisi mirata di `lib/pulsar-edit-mcp-server.js`, mappatura delle responsabilità correnti, proposta di scomposizione modulare iniziale e applicazione di prime estrazioni strutturali a basso rischio direttamente sul repository.

#### Mappa delle responsabilità rilevate nell’entry point originario

L’entry point originario accentrava nello stesso file le seguenti responsabilità:

1. bootstrap Express e definizione delle route HTTP MCP (`POST /mcp`, `GET /mcp`, `DELETE /mcp`)
2. gestione delle sessioni MCP e della mappa `transports`
3. creazione del server MCP e registrazione dei tool via `mcpRegistration(...)`
4. bootstrap del client MCP locale e connessione verso `http://localhost:<port>/mcp`
5. lettura configurazione runtime al top-level (`atom.config.get(...)`)
6. gestione del lifecycle Pulsar (`activate`, `deactivate`, `serialize`)
7. registrazione comando package `pulsar-edit-mcp-server:listen`
8. apertura e binding del chat panel
9. gestione status bar e click handler per toggle listening
10. iniezione stili diff nell’editor
11. utility UUID locale per supportare la session initialization

#### Principali criticità emerse su `lib/pulsar-edit-mcp-server.js`

* file con responsabilità di **composition root** e **runtime operativo** mescolate
* presenza di side effect e stato runtime definiti a livello di modulo invece che nel ciclo di vita del package
* dipendenza diretta dell’entry point da dettagli MCP/Express che dovrebbero essere isolati
* gestione status bar accoppiata alla logica di ascolto
* `consumeStatusBar` inizializzava visivamente lo stato come attivo (`true`) anche prima dell’avvio reale del listener
* presenza di codice morto o non utile nel toggle (`editor`, `words`)
* spec principale rimasta ancorata al comando legacy `toggle`

#### Proposta di scomposizione modulare minima coerente con architettura target

Prima scomposizione introdotta, mantenendo basso il rischio di regressione:

* `lib/pulsar-edit-mcp-server.js` → package coordinator / composition root
* `lib/mcp/server-runtime.js` → bootstrap Express + lifecycle HTTP/MCP server + session transport registry
* `lib/mcp/client-runtime.js` → bootstrap/teardown del client MCP locale
* `lib/ui/status-bar.js` → gestione dedicata del tile status bar

Confini introdotti:

* l’entry point **non costruisce più direttamente** route Express, transport MCP e client transport
* la porta MCP viene letta **a runtime** tramite funzione dedicata e non più congelata al load time del modulo
* lo stato visuale della status bar è aggiornato tramite controller dedicato, separato dalla logica di start/stop

#### Prime fix strutturali applicate nel repository

1. estratto il bootstrap del server MCP in `lib/mcp/server-runtime.js`
2. estratto il bootstrap del client MCP in `lib/mcp/client-runtime.js`
3. estratta la gestione del tile status bar in `lib/ui/status-bar.js`
4. ridotto `lib/pulsar-edit-mcp-server.js` a coordinatore del lifecycle package
5. spostata la lettura della porta MCP in `getMcpServerPort()` per evitare freeze del valore al top-level
6. reso `listenToggle()` asincrono e più lineare
7. reso `stopListening()` idempotente e centralizzato per client/server
8. corretto l’aggiornamento iniziale della status bar in coerenza con `this.listening`
9. rimosso codice morto dal toggle
10. riallineata la spec principale al comando reale `pulsar-edit-mcp-server:listen`

#### Controlli e valutazione A.2.a

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 02 | Entry point del package ben definito | PARZIALE | `lib/pulsar-edit-mcp-server.js` ora agisce come coordinatore; server/client/status bar estratti in moduli dedicati | Alto | continuare rifattorizzazione controllata |
| 03 | Separazione bootstrap/runtime/business logic | PARZIALE | introdotti `lib/mcp/server-runtime.js`, `lib/mcp/client-runtime.js`, `lib/ui/status-bar.js`; rimane ancora accoppiamento con apertura chat e installazione stili | Alto | separare ulteriormente UI bootstrap e package services |
| 05 | Lifecycle Pulsar corretto (`activate`, `deactivate`, `serialize`) | PARZIALE | `deactivate()` ora effettua teardown ordinato e asincrono di client/server; `serialize()` usa accesso difensivo | Medio | verificare teardown completo anche del chat pane e dei disposable secondari |
| 06 | Commands, menus e keymaps coerenti con le feature reali | PARZIALE | spec aggiornata da `toggle` a `listen`; menu e keymap risultano coerenti con `listen` | Medio | estendere verifica alle altre spec e alla UX del comando |
| 09 | Avvio server MCP separato e controllabile | PARZIALE | startup/stop del listener demandati a `createMcpHttpRuntime(...).start()/stop()` | Alto | aggiungere gestione errori porta occupata e restart safe |
| 10 | Gestione sessioni MCP corretta | PARZIALE | registry `transports` spostato dentro `server-runtime`; cleanup su `onclose` e stop server | Medio | verificare chiusura completa di eventuali sessioni attive |
| 18 | Separazione UI chat / orchestrazione tool / provider LLM | PARZIALE | l’entry point non contiene più bootstrap client/server inline; `chat-functions.js` resta però accoppiato | Alto | futura estrazione orchestrazione chat/provider |
| 19 | Gestione robusta di errori, timeout e stato conversazionale | PARZIALE | migliorata la linearità start/stop, ma mancano ancora guardie su errori di bind/connect | Medio | introdurre error handling esplicito nel runtime MCP |

#### Esito sintetico A.2.a

L’intervento ha ridotto il carico dell’entry point senza introdurre una riscrittura invasiva.
La direzione è corretta: il package root inizia a diventare un **coordinator** mentre i dettagli infrastrutturali vengono confinati in moduli dedicati.

Resta però ancora incompleta la separazione dei layer superiori:

* bootstrap UI/chat ancora parzialmente dentro il package entry point
* orchestrazione LLM ancora concentrata in `chat-functions.js`
* assenza di gestione errori strutturata per start/stop di server e client MCP

#### Indicazione operativa per il prossimo step

Proseguire con una sottofase A.2.b focalizzata su:

* completamento mappatura struttura del progetto
* censimento dei moduli ancora monolitici (`chat-functions.js`, `mcp-registration.js`)
* verifica side effect top-level residui
* definizione del perimetro di successiva estrazione per chat orchestration e tool registration


### A.2.b — Completamento mappatura struttura progetto e identificazione dei prossimi monoliti

Obiettivo eseguito:

completata la mappatura strutturale del repository dopo la prima decomposizione dell’entry point, con analisi mirata dei moduli `lib/chat-functions.js` e `lib/mcp-registration.js`, censimento dei side effect top-level residui, ricognizione degli accoppiamenti principali e definizione del successivo piano di estrazione modulare.

#### Mappa strutturale aggiornata del repository

La snapshot corrente del repository mostra una struttura ancora compatta ma già articolata in alcuni primi sottolayer.

##### Layout rilevato

* `package.json` definisce package Pulsar, configurazione runtime minima e dipendenze MCP/LLM
* `lib/pulsar-edit-mcp-server.js` è ora il **package coordinator**
* `lib/mcp/server-runtime.js` contiene bootstrap HTTP/MCP server e gestione sessioni
* `lib/mcp/client-runtime.js` contiene bootstrap/teardown del client MCP locale
* `lib/ui/status-bar.js` contiene il controller del tile status bar
* `lib/chat-panel.js` costruisce il pannello chat e collega gli handler UI
* `lib/chat-functions.js` resta il principale **monolite lato chat/orchestrazione provider**
* `lib/mcp-registration.js` resta il principale **monolite lato tool registry/editor operations**
* `lib/pulsar-edit-mcp-server-view.js` appare residuale/minimale
* `spec/*` copre solo smoke test legacy e non presidia i nuovi runtime estratti
* `styles/*`, `menus/*`, `keymaps/*` sono presenti e coerenti come shell UX, ma non ancora supportati da una suite di regressione adeguata

##### Distribuzione del peso logico per modulo

Dalla ricognizione per dimensione e responsabilità:

* `lib/mcp-registration.js` (~787 linee) è il modulo più denso e concentra registrazione tool, mutazioni editor, letture editor e gestione highlighting
* `lib/chat-functions.js` (~171 linee) concentra configurazione provider, stato conversazionale globale, fetch modelli, tool loop e rendering chat
* `lib/pulsar-edit-mcp-server.js` (~142 linee) è alleggerito ma mantiene ancora bootstrap UI e style injection
* `lib/chat-panel.js` (~151 linee) è focalizzato sulla view ma contiene ancora chiamate dirette a funzioni di orchestrazione globale

Questa distribuzione conferma che i prossimi candidati naturali alla scomposizione sono:

1. `lib/chat-functions.js`
2. `lib/mcp-registration.js`

#### Analisi mirata di `lib/chat-functions.js`

Il modulo `lib/chat-functions.js` combina in un solo file responsabilità che nell’architettura target dovrebbero essere separate.

##### Responsabilità attualmente concentrate

* lettura configurazione provider (`apiEndpointPrefix`, `apiKey`) a load time
* caching modelli
* caching tool MCP esposti al provider
* mantenimento della conversation history globale
* serializzazione del formato tool OpenAI-compatible
* chiamata HTTP al provider `/v1/chat/completions`
* loop ricorsivo tool-calling → tool execution → nuova chiamata LLM
* rendering messaggi in chat via `marked`, `DOMPurify`, `highlight.js`
* binding implicito allo stato della specifica istanza UI (`chatObj`, `chatDisplay`)

##### Criticità strutturali emerse

* **side effect/config freeze a top-level**: endpoint e API key vengono letti una sola volta all’import del modulo; eventuali cambi config in runtime non vengono recepiti
* **stato globale condiviso**: `mcpTools`, `chatDisplay`, `marked`, `DOMPurify`, `currentModel`, `cachedModels`, `chatObj`, `llmContextHistory` sono mutabili a livello di modulo
* **accoppiamento UI ↔ orchestrazione**: l’orchestrazione non è indipendente dalla view perché aggiorna direttamente DOM e thinking indicator
* **accoppiamento provider ↔ protocol adapter**: la conversione dei tool MCP nel formato provider è hard-coded nel medesimo modulo
* **bug logico sul caching tool**: `getMcpTools()` valorizza `openAiTools` localmente ma non salva in `mcpTools`; nel ramo `else` restituisce comunque una variabile non definita nel relativo scope
* **gestione asincrona incompleta**: `handleSendMessage()` invoca `chatToLLM(...)` senza `await`, quindi il controllo torna alla UI prima che il ciclo LLM sia realmente concluso
* **clear incompleto dello stato**: `clearContextHistory()` azzera l’array senza reinserire il messaggio `system`, alterando il contratto conversazionale dopo il primo reset
* **timeout/retry assenti**: `fetch` verso provider e model list non hanno abort controller, retry o classificazione errori
* **multi-chat non supportata correttamente**: essendo tutto su stato globale di modulo, più istanze o riaperture del pannello condividerebbero contesto e cache in modo implicito
* **export/import incoerente**: `chat-panel.js` importa anche `setModel`, ma `chat-functions.js` non lo esporta

##### Confini di responsabilità raccomandati per la scomposizione

Per allinearsi all’architettura target il modulo andrebbe spezzato almeno in:

* `chat/runtime-config.js` → lettura configurazione runtime provider
* `chat/conversation-store.js` → stato conversazionale, reset, seed system prompt
* `chat/provider-client.js` → `fetchModels()` e `createChatCompletion()` con timeout/error mapping
* `chat/tool-adapter.js` → conversione tools MCP nel formato del provider
* `chat/chat-orchestrator.js` → loop tool-calling e sequencing della conversazione
* `chat/chat-renderer.js` oppure funzioni view-local → rendering markdown/sanitize/highlight
* eventuale `chat/session-controller.js` → oggetto per istanza pannello, senza stato globale condiviso

#### Analisi mirata di `lib/mcp-registration.js`

`lib/mcp-registration.js` è oggi il principale centro di gravità del codice applicativo.

##### Responsabilità attualmente concentrate

* registrazione di tutti i tool MCP direttamente contro `server.registerTool(...)`
* definizione schema input e descrizioni dei tool
* operazioni di lettura editor
* operazioni di scrittura editor
* operazioni di apertura file e scansione progetto
* diff/highlight temporaneo delle modifiche
* gestione di disposable e marker decorations
* policy implicite di editing (mutazione diretta, undo/redo, sostituzione documento)

##### Criticità strutturali emerse

* **monolite registry + implementation**: il file mescola catalogo dei tool e logica concreta dei singoli handler
* **tool write-path troppo permissivi**: `replace-text`, `replace-document`, `insert-line`, `insert-text-at-line`, `delete-line`, `delete-line-range`, `undo`, `redo` operano direttamente sul buffer senza un workflow proposta/applicazione
* **accoppiamento forte ai singleton Atom**: quasi ogni handler legge direttamente `atom.workspace.getActiveTextEditor()` o `atom.project.getPaths()`
* **policy di sicurezza non esplicita**: non esiste una distinzione formale tra tool read-only e tool mutating
* **highlight lifecycle non incapsulato**: `packageDisposables` e `activeHighlightSets` sono stati globali di modulo e non risultano agganciati al lifecycle del package coordinator
* **responsabilità trasversali nel medesimo file**: validation, editor selection, path handling, diff visualization e filesystem traversal convivono senza boundary
* **scalabilità limitata**: ogni nuovo tool allunga ulteriormente un file già ampio, aumentando il costo di review
* **testabilità bassa**: gli handler non sono costruiti da dipendenze iniettate e quindi risultano difficili da testare in isolamento
* **rischio UX/coerenza**: il focus su active editor rende i tool dipendenti dal tab corrente più che da un contesto documento esplicito
* **filesystem walk grezzo** in `get-project-files`: scansione ricorsiva completa senza filtri, limiti o esclusioni note

##### Raggruppamento naturale dei tool emerso dall’audit

Dalla lettura del file si distinguono già confini plausibili:

* **Tool di introspezione documento**
  * `get-document`
  * `get-line-count`
  * `get-selection`
  * `get-filename`
  * `get-full-path`
  * `get-context-around`

* **Tool di navigazione workspace/file**
  * `get-project-files`
  * `open-file`

* **Tool di mutazione editor**
  * `replace-text`
  * `replace-document`
  * `insert-line`
  * `insert-text-at-line`
  * `delete-line`
  * `delete-line-range`
  * `undo`
  * `redo`

* **Infrastructure/UI diff helpers**
  * `decorateEditedLines`
  * `decorateLine`
  * `addDecoration`

##### Confini di responsabilità raccomandati per la scomposizione

Una scomposizione coerente e incrementale dovrebbe introdurre:

* `mcp/tools/register-read-tools.js`
* `mcp/tools/register-navigation-tools.js`
* `mcp/tools/register-write-tools.js`
* `mcp/tools/editor-context.js` → accesso centralizzato a active editor/buffer/path
* `mcp/tools/document-read-service.js`
* `mcp/tools/document-write-service.js`
* `mcp/tools/project-file-service.js`
* `mcp/tools/diff-highlighter.js`
* `mcp/tools/tool-groups.js` oppure `mcp/tools/index.js` come composition root dei registri

In un secondo momento, il write layer dovrebbe evolvere verso:

* `proposal service` per generare patch/proposte
* `apply service` separato, esplicitamente confermato dall’utente
* tool mutanti ridotti o protetti dietro flag/config

#### Side effect top-level residui censiti

Dopo la prima decomposizione dell’entry point restano i seguenti side effect o stati globali di modulo da considerare prioritari.

##### Residui rilevati

* `lib/chat-functions.js`
  * lettura config provider a top-level
  * stato conversazionale e cache globali di modulo
  * dipendenza singleton da DOM renderer / panel corrente

* `lib/mcp-registration.js`
  * `packageDisposables` creato a top-level
  * `activeHighlightSets` creato a top-level
  * funzioni helper che dipendono da stato globale del modulo per cleanup marker

* `lib/chat-panel.js`
  * bootstrap model list nel costruttore della view
  * import diretto di funzioni di orchestrazione globale

* `lib/pulsar-edit-mcp-server.js`
  * installazione stylesheet eseguita ad `activate()`, coerente con lifecycle ma ancora accoppiata al coordinator
  * apertura automatica del pannello chat in `activate()` ancora molto invasiva dal punto di vista UX/bootstrap

#### Valutazione A.2.b

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 01 | Repository layout chiaro e coerente | PARZIALE | struttura piccola e leggibile; introdotte cartelle `lib/mcp` e `lib/ui`, ma i monoliti funzionali restano in root `lib/` | Medio | continuare riallineamento dei moduli per dominio |
| 03 | Separazione bootstrap/runtime/business logic | PARZIALE | entry point migliorato; `chat-functions.js` e `mcp-registration.js` mantengono business logic e orchestration nello stesso modulo | Alto | proseguire con estrazioni per dominio |
| 04 | Presenza di file legacy o scaffold non più coerenti | PARZIALE | `lib/pulsar-edit-mcp-server-view.js` e parte delle spec appaiono residuali/legacy rispetto al flusso chat reale | Medio | classificare file riutilizzabili vs deprecabili |
| 07 | Apertura e gestione pannello UI corretta | PARZIALE | `chat-panel.js` costruisce bene la view, ma il package apre il pannello automaticamente in `activate()` e la view fa bootstrap modelli da sola | Medio | separare view bootstrap da orchestration/services |
| 11 | Registrazione tool MCP organizzata e scalabile | CRITICO | `lib/mcp-registration.js` (~787 linee) mescola registry, tool handlers, diff helpers e policy di scrittura | Alto | spezzare per gruppi di tool e servizi editor |
| 12 | Contratti tool chiari e coerenti | PARZIALE | descrizioni e schema Zod presenti; manca distinzione formale read-only vs mutating e un contratto di approval/apply | Alto | introdurre taxonomy tool e policy operative |
| 14 | Tool di lettura sufficientemente sicuri e precisi | PARZIALE | tool read utili, ma dipendono tutti dall’active editor e non da un contesto documento esplicito | Medio | consolidare document context service |
| 15 | Tool di scrittura troppo permissivi o poco protetti | CRITICO | mutazioni dirette su buffer in più tool senza gate, preview o conferma utente | Alto | preparare workflow proposal/apply e limitare write-path |
| 18 | Separazione tra UI chat, orchestrazione tool e provider LLM | CRITICO | `chat-functions.js` miscela config provider, history, tool loop e rendering UI; `chat-panel.js` dipende da orchestrazione globale | Alto | estrarre chat session controller e provider client |
| 19 | Gestione robusta di errori, timeout e stato conversazionale | CRITICO | fetch senza timeout/retry; stato globale di modulo; reset contesto incompleto; send non awaitato | Alto | introdurre conversation store, timeout e error mapping |
| 20 | Sicurezza applicativa lato chat/HTML/rendering | PARZIALE | `DOMPurify` è presente e `marked` viene sanitizzato; resta da separare il renderer dall’orchestrazione e verificare configurazione end-to-end | Medio | isolare renderer e formalizzare pipeline di rendering |

#### Prossimo piano di estrazione modulare proposto

Ordine consigliato, coerente con rischio tecnico e valore architetturale:

##### Step successivo raccomandato: A.2.c

**Target primario: `lib/chat-functions.js`**

Perché prima del registry tool:

* ha minore superficie rispetto a `mcp-registration.js`
* sblocca una separazione netta tra UI, sessione conversazionale e provider
* riduce side effect top-level ad alto impatto
* crea pattern architetturale replicabile poi sul layer tool MCP

##### Piano di estrazione a basso rischio per `chat-functions.js`

1. introdurre un `conversation-store` per istanza, con system prompt reinizializzabile
2. introdurre un `provider-config` letto a runtime, non a import-time
3. spostare `fetchModels()` e chat completion in un `provider-client`
4. spostare conversione tools MCP in un `tool-adapter`
5. creare un `chat-orchestrator` privo di riferimenti diretti al DOM
6. lasciare in `chat-panel.js` solo rendering/view events
7. sostituire le variabili globali di modulo con un oggetto sessione passato esplicitamente

##### Step immediatamente successivo dopo A.2.c

**Target: `lib/mcp-registration.js`**

Piano iniziale:

1. estrarre helper `editor-context` e `diff-highlighter`
2. separare registrazione read tools da write tools
3. introdurre taxonomy `read / navigate / mutate`
4. centralizzare le mutazioni in `document-write-service`
5. preparare l’introduzione di un workflow proposal/apply

#### Esito sintetico A.2.b

La mappatura strutturale è ora sufficientemente completa per identificare con chiarezza i due prossimi monoliti e il corretto ordine di intervento.

Conclusione operativa:

* `lib/chat-functions.js` è il prossimo candidato migliore per una decomposizione immediata
* `lib/mcp-registration.js` resta il monolite più grande, ma conviene affrontarlo subito dopo aver fissato il pattern di scomposizione sul layer chat
* i side effect top-level residui sono ormai localizzati e censiti, quindi il refactor può proseguire in modo incrementale e verificabile


### A.2.c — Prima estrazione modulare del layer chat/orchestrazione LLM

Obiettivo eseguito:

scomposto `lib/chat-functions.js` in moduli dedicati, riducendo i side effect top-level del layer chat, separando configurazione provider, stato conversazionale, adapter dei tool MCP, client HTTP verso il provider, orchestrazione del tool loop e rendering dei messaggi, mantenendo compatibile il contratto pubblico usato dal pannello chat.

#### Modifiche applicate direttamente al repository

Nuovi moduli introdotti sotto `lib/chat/`:

* `config.js` → lettura runtime di `apiEndpointPrefix` e `apiKey`, con default espliciti
* `conversation-state.js` → store conversazionale con normalizzazione messaggi e reset che reinserisce il system prompt
* `chat-renderer.js` → rendering markdown → sanitize → highlight, isolato dal loop LLM
* `tool-catalog.js` → adattamento e caching dei tool MCP per client, senza leakage di scope
* `model-client.js` → fetch modelli e chat completions con cache per provider/configurazione
* `chat-orchestrator.js` → ciclo user → assistant → tool calls → assistant, indipendente dalla costruzione del DOM

Moduli aggiornati:

* `lib/chat-functions.js` → ridotto a façade/composition root del layer chat
* `lib/chat-panel.js` → rimosso import incoerente di `setModel`
* `package.json` → aggiunto script `test:unit` per eseguire i test Node introdotti in questa sessione

Test introdotti:

* `test/chat/conversation-state.test.js`
* `test/chat/tool-catalog.test.js`
* `test/chat/chat-orchestrator.test.js`

#### Confine architetturale raggiunto

Dopo l’estrazione, `lib/chat-functions.js` non contiene più direttamente:

* cache modelli e tool implementate inline
* stato conversazionale e reset del contesto mescolati al rendering
* logica HTTP del provider
* loop ricorsivo tool-calling nel medesimo file della UI

Il file resta invece come **facade minimale** che assembla i componenti del layer chat ed espone le funzioni già usate dal pannello.

#### Correzioni tecniche incorporate nel refactor

Le principali criticità emerse in A.2.b sono state affrontate così:

* **config provider non più congelata a import-time**: endpoint e API key vengono letti a runtime tramite `getChatConfig()`
* **bug `getMcpTools()` eliminato**: l’adattamento OpenAI-style viene ora cacheato correttamente nel `WeakMap` del `tool-catalog`
* **reset conversazione corretto**: `clearContextHistory()` reimposta sempre il messaggio `system`
* **send path correttamente awaitabile**: `handleSendMessage(...)` ritorna la Promise dell’orchestratore, quindi il pannello può intercettare gli errori reali
* **thinking indicator reso simmetrico**: l’attivazione/disattivazione è chiusa in `try/finally` nel layer orchestrator
* **import incoerente rimosso**: `chat-panel.js` non importa più `setModel`, che non esisteva nell’API del modulo

#### Limiti e decisioni di contenimento adottate

Per contenere il rischio in questa sottofase:

* non è stata ancora introdotta una vera sessione per-istanza di pannello; il facade `chat-functions.js` mantiene una singola composizione di default, ma con stato ora confinato in moduli specializzati e non sparso in variabili globali eterogenee
* il renderer chat è ancora invocato dall’orchestrator tramite `uiContext`, ma la responsabilità di rendering è stata comunque separata in un modulo dedicato
* non sono ancora presenti timeout/retry HTTP né un error mapping più ricco sul provider
* `chat-panel.js` continua a bootstrapparsi il model list nel costruttore; questo punto resta aperto per il passo successivo sul layer UI/chat-session

#### Verifiche eseguite

##### Test automatici eseguiti con esito positivo

Comando eseguito:

```bash
npm run test:unit
```

Esito:

* 4 test eseguiti
* 4 test passati
* nessun failure

Copertura mirata ottenuta:

* reset del conversation store con reinserimento del system prompt
* normalizzazione dei messaggi con `content: null`
* caching del catalogo tool per client MCP
* ciclo orchestrator con tool call, callback MCP e rendering finale assistant

##### Tentativo di eseguire gli spec Pulsar

È stato verificato anche il contesto di esecuzione locale per gli spec package-style, ma nell’ambiente corrente non sono disponibili binari/runtime Pulsar o Atom (`pulsar`, `ppm`, `atom`, `apm` assenti).

Conclusione verificabile:

* i **test unitari Node introdotti in questa sessione sono stati eseguiti con successo**
* gli **spec Pulsar legacy presenti in `spec/` non sono eseguibili in questo ambiente** per assenza del test runner editoriale
* la verifica end-to-end sul package resta quindi demandata al tuo test diretto in Pulsar, come previsto dal workflow concordato

#### Valutazione A.2.c

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 03 | Separazione bootstrap/runtime/business logic | PARZIALE | `lib/chat-functions.js` è stato ridotto a facade; la business logic chat è stata spostata in `lib/chat/*` | Alto | continuare con separazione analoga sul layer MCP tool |
| 07 | Apertura e gestione pannello UI corretta | PARZIALE | `chat-panel.js` resta view-centric, ma l’orchestrazione non è più definita inline nello stesso modulo | Medio | isolare ulteriormente bootstrap modelli e session binding UI |
| 18 | Separazione tra UI chat, orchestrazione tool e provider LLM | PARZIALE | introdotti `config.js`, `model-client.js`, `tool-catalog.js`, `chat-orchestrator.js`, `chat-renderer.js`, `conversation-state.js` | Alto | completare passaggio a session controller per-istanza |
| 19 | Gestione robusta di errori, timeout e stato conversazionale | PARZIALE | reset system prompt corretto, `handleSendMessage` awaitabile, indicatori chiusi in `finally`; mancano timeout/retry | Alto | aggiungere timeout/error mapping e session lifecycle |
| 20 | Sicurezza applicativa lato chat/HTML/rendering | PARZIALE | rendering markdown/sanitize/highlight isolato in `chat-renderer.js`, con `DOMPurify` ancora usato nel flusso | Medio | verificare poi policy rendering e messaggi errore unificati |
| 06 | Commands, menus e keymaps coerenti con le feature reali | PARZIALE | nessuna regressione introdotta nel command surface; aggiunto solo script `test:unit` in `package.json` | Basso | mantenere stabile durante la decomposizione del registry MCP |
| 11 | Registrazione tool MCP organizzata e scalabile | CRITICO | `lib/mcp-registration.js` resta il maggiore monolite non ancora separato | Alto | affrontare come prossimo target diretto |

#### Esito sintetico A.2.c

La decomposizione del layer chat è riuscita senza cambiare il contratto pubblico già usato dal pannello. Il refactor ha rimosso i principali odori architetturali individuati in A.2.b sul modulo `chat-functions.js` e ha fissato un pattern di estrazione riutilizzabile anche per `mcp-registration.js`.

Il repository ora presenta un primo sottolayer `lib/chat/` coerente con l’architettura target:

* configurazione runtime separata
* conversation store dedicato
* client provider dedicato
* adapter/catalogo tool separato
* orchestrazione del loop LLM separata dal facade
* rendering chat estratto

#### Indicazione operativa per il prossimo step

Proseguire con una sottofase A.2.d focalizzata su:

* scomposizione iniziale di `lib/mcp-registration.js`
* estrazione di `diff-highlighter` e `editor-context`
* separazione dei registri `read`, `navigation` e `write`
* preparazione del futuro workflow `proposal/apply` senza ancora rompere la compatibilità dei tool attuali

---

## A.3 — Analisi dipendenze

Verifica:

* package.json
* dipendenze obsolete
* librerie MCP utilizzate

---

## A.4 — Analisi implementazione MCP

Controllo:

* definizione tools
* protocol handling
* gestione sessioni

---

## A.5 — Valutazione integrazione Pulsar

Analisi:

* commands
* UI components
* lifecycle package

---

Output finale della Fase A:

* elenco componenti riutilizzabili
* elenco componenti da rifattorizzare
* elenco componenti da riscrivere

---

# FASE B — Hardening architetturale

Obiettivo:

rifattorizzare il progetto separando i layer.

Attività:

* separazione UI
* isolare MCP server
* creare editor command layer
* definire adapter provider LLM

---

# FASE C — MVP stabile

Obiettivo:

creare una prima versione realmente usabile.

Funzionalità:

* pannello chat
* tool MCP base
* preview patch
* apply patch con conferma
* gestione errori

---

# FASE D — Maturazione

Obiettivo:

portare il plugin a livello production-ready.

Attività:

* test automatici
* packaging
* documentazione
* compatibilità multi-client MCP

---

# 10. Session Log

## Sessione 1

Attività svolta:

* analisi integrazione ChatGPT/Codex in Pulsar
* confronto architetture possibili
* scelta MCP
* identificazione repository base
* definizione roadmap sviluppo

Stato progetto:

```
START
```

---

## Sessione 2

Attività svolta:

* caricamento del file di traccia e dello ZIP aggiornato del fork
* avvio della FASE A — Audit del repository
* definizione della checklist tecnica di revisione
* prima lettura strutturale del repository
* identificazione delle priorità architetturali iniziali
* predisposizione del primo passo di analisi e revisione

Evidenze principali registrate:

* entry point del package troppo carico di responsabilità
* accoppiamento forte tra runtime Pulsar, MCP server e MCP client
* `mcp-registration.js` già candidato a futura modularizzazione
* tool di scrittura da irrobustire con workflow più controllato
* layer chat/provider ancora troppo accoppiato
* presenza di segnali legacy nelle spec e nei comandi

Stato progetto:

```
FASE A AVVIATA
A.1 DEFINITA
PRIORITÀ TECNICHE IDENTIFICATE
```

## Sessione 3

Attività svolta:

* eseguita analisi mirata di `lib/pulsar-edit-mcp-server.js`
* censite responsabilità, side effect e punti di accoppiamento dell’entry point
* definita una prima scomposizione modulare a basso rischio
* implementata estrazione del runtime MCP server in modulo dedicato
* implementata estrazione del runtime MCP client in modulo dedicato
* implementata estrazione della gestione status bar in modulo dedicato
* alleggerito l’entry point riducendolo a coordinatore del package
* riallineata la spec principale al comando reale `listen`

Evidenze principali registrate:

* l’entry point originario concentrava bootstrap package, server HTTP/MCP, session registry, client MCP, status bar, apertura chat e style injection
* la lettura configurazione della porta MCP al top-level irrigidiva il runtime
* la status bar veniva inizializzata con stato visivo non coerente con l’ascolto reale
* la modularizzazione introdotta è coerente con l’architettura target ma ancora incompleta sul lato chat/provider e tool registration

Stato progetto:

```
FASE A IN CORSO
A.2.a ESEGUITA
ENTRY POINT PARZIALMENTE DECOMPOSTO
PRIME FIX STRUTTURALI APPLICATE
```

## Sessione 4

Attività svolta:

* completata la mappatura strutturale aggiornata del repository
* analizzati in modo mirato `lib/chat-functions.js` e `lib/mcp-registration.js`
* censiti i side effect top-level residui dopo la decomposizione dell’entry point
* classificati accoppiamenti, confini di responsabilità e criticità architetturali
* definito l’ordine consigliato dei prossimi refactor modulari

Evidenze principali registrate:

* `lib/chat-functions.js` miscela configurazione provider, stato conversazionale globale, fetch modelli, tool loop e rendering chat
* `lib/chat-functions.js` contiene un bug nel caching/esposizione dei tool (`getMcpTools`) e un reset del contesto che perde il system prompt
* `lib/chat-panel.js` importa `setModel` senza export corrispondente e mantiene bootstrap modelli lato view
* `lib/mcp-registration.js` concentra registry tool, handler read/write, highlighting diff e policy implicite di editing
* i tool di scrittura restano troppo permissivi e non separano ancora proposta e applicazione
* i principali side effect top-level residui sono ormai localizzati nei layer chat e tool registration

Stato progetto:

```
FASE A IN CORSO
A.2.b ESEGUITA
STRUTTURA REPOSITORY MAPPATA
PROSSIMI MONOLITI IDENTIFICATI
PIANO DI ESTRAZIONE SUCCESSIVO DEFINITO
```

## Sessione 5

Attività svolta:

* eseguita la sottofase A.2.c con refactor reale del layer chat
* scomposto `lib/chat-functions.js` in moduli dedicati sotto `lib/chat/`
* aggiornato `lib/chat-panel.js` rimuovendo l’import incoerente di `setModel`
* aggiunti test unitari Node mirati sul nuovo sottolayer chat
* eseguiti i test automatici disponibili nell’ambiente corrente

Evidenze principali registrate:

* il layer chat ora è suddiviso in `config`, `conversation-state`, `chat-renderer`, `tool-catalog`, `model-client`, `chat-orchestrator`
* `chat-functions.js` è diventato un facade/composition root invece di un modulo monolitico con stato eterogeneo inline
* il reset del contesto preserva di nuovo il system prompt
* il path di invio del messaggio ritorna una Promise reale e il thinking indicator viene spento in `finally`
* il bug del caching tool è stato corretto tramite `WeakMap` per client MCP
* gli spec Pulsar legacy non sono eseguibili in questo ambiente perché mancano i binari/runtime editoriali; i test Node introdotti risultano invece eseguiti con successo

Stato progetto:

```
FASE A IN CORSO
A.2.c ESEGUITA
LAYER CHAT DECOMPOSTO
TEST UNITARI CHAT PASSATI
PROSSIMO TARGET: MCP REGISTRATION
```

---


## Sessione 6

Attività svolta:

* analizzata la segnalazione di deprecation emersa durante l'installazione su Pulsar
* tracciato il warning ai selettori CSS diff iniettati da `installEditorStyles()`
* estratta la stylesheet diff editor in un modulo dedicato `lib/ui/editor-diff-styles.js`
* sostituiti i selettori legacy `atom-text-editor::shadow` con selettori compatibili con Pulsar >= 1.13
* aggiunto un test unitario di regressione sui selettori CSS
* rieseguiti i test automatici Node disponibili nell'ambiente corrente

### A.2.c.1 — Correzione compatibilità Pulsar per selettori diff editor

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 21 | Warning di deprecation riprodotto e localizzato | OK | nota utente coerente con `installEditorStyles()` che usava `atom-text-editor::shadow` | Medio | correggere riferimenti CSS legacy |
| 22 | Selettori diff editor compatibili con Pulsar >= 1.13 | OK | introdotto `lib/ui/editor-diff-styles.js` con selettori `atom-text-editor.editor .mcp-diff-*` | Medio | mantenere nuovo modulo dedicato |
| 23 | Assenza di selector legacy nel runtime del package | OK | `lib/pulsar-edit-mcp-server.js` ora delega a `getEditorDiffStyleSheetText()` senza `::shadow` | Medio | consolidare con test di regressione |
| 24 | Regressione automatica coperta da test | OK | aggiunto `test/ui/editor-diff-styles.test.js` | Basso | tenere in suite unit test |
| 25 | Suite automatica disponibile dopo la fix | OK | `npm run test:unit` eseguito con esito 5/5 passati | Medio | proseguire sul prossimo monolite |

Evidenze principali registrate:

* la deprecation segnalata in Pulsar derivava dai selettori `atom-text-editor::shadow .mcp-diff-added` e `atom-text-editor::shadow .mcp-diff-removed` nel runtime package
* la fix non richiede `syntax--` perché le classi coinvolte sono classi custom del package e non selettori syntax legacy dell'editor
* l'iniezione stile diff è ora isolata in un modulo riusabile e verificabile via test unitario
* il warning dovrebbe cessare nelle installazioni Pulsar che applicano già la traduzione automatica dei selettori legacy

Stato progetto:

```
FASE A IN CORSO
A.2.c STABILIZZATA
COMPATIBILITÀ CSS PULSAR AGGIORNATA
TEST UNITARI 5/5 PASSATI
PROSSIMO TARGET: MCP REGISTRATION
```

---

# 11. Prossimo step operativo

Step operativo pronto:

```
A.2.d — Prima decomposizione di `lib/mcp-registration.js`
```

Focus:

* estrarre `editor-context` e `diff-highlighter` fuori dal monolite attuale
* separare la registrazione dei tool in gruppi `read`, `navigation`, `write`
* ridurre gli stati globali di modulo (`packageDisposables`, `activeHighlightSets`)
* predisporre un boundary più chiaro tra read-only tools e mutating tools
* mantenere compatibilità funzionale dei tool esistenti prima di introdurre il workflow `proposal/apply`
* preservare la compatibilità Pulsar raggiunta sui selettori diff editor

---

# 12. Prompt di ripartenza per la prossima sessione

All'inizio della prossima chat inviare:

```
Sto sviluppando un plugin Pulsar basato su MCP partendo dal fork
drunnells/pulsar-edit-mcp-server.

Ti invio:

1) il file PULSAR_MCP_DEV_LOG.md aggiornato
2) lo ZIP completo del repository aggiornato

Ripartiamo dalla FASE A — Audit del repository.

Step corrente:
A.2.d — Prima decomposizione di `lib/mcp-registration.js`.

Obiettivo della sessione:
avviare la scomposizione reale di `lib/mcp-registration.js`,
estraendo prima i componenti infrastrutturali a minor rischio
(`editor-context`, `diff-highlighter`) e separando la registrazione
dei tool in gruppi `read`, `navigation` e `write`, mantenendo i tool
attuali funzionanti, preservando la compatibilità Pulsar già corretta
sui selettori diff editor e aggiornando il log completo con evidenze,
impatto e prossimo piano operativo.

Mantieni sempre il file PULSAR_MCP_DEV_LOG.md completo, aggiornalo
senza comprimere o omettere parti e continua a usare lo schema tabellare:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |

per tutta l’analisi e la revisione.
```


---

# 13. Sessione 6 — A.2.e Metadata normalization e sostituzione README

Obiettivo sessione:

* aggiornare i metadati di package al repository effettivo del fork
* cambiare la porta di default MCP per ridurre collisioni con ambienti di sviluppo locali
* sostituire integralmente `README.md` con la versione fornita dall'utente
* rieseguire la suite di test unitari prima di chiudere lo step

Tabella controlli:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 26 | Repository metadata riallineato al fork attuale | OK | `package.json` aggiornato da stringa legacy `drunnells/...` a oggetto repository Git verso `https://github.com/coppolaf/pulsar-edit-mcp-server` | Medio | mantenere il fork corrente come sorgente canonica del package |
| 27 | Porta MCP di default riallineata a valore meno collision-prone | OK | `configSchema.mcpServerPort.default` portato da `3000` a `6277` | Medio | usare 6277 come default e lasciare configurabilità utente invariata |
| 28 | Descrizione impostazione porta resa più esplicita | OK | `configSchema.mcpServerPort.description` aggiornata per motivare la scelta del default | Basso | mantenere testo descrittivo finché non emerga una convenzione diversa di progetto |
| 29 | README sostituito con la versione fornita dall'utente | OK | `README.md` rimpiazzato integralmente con il contenuto allegato in sessione, inclusi riferimenti al fork e istruzioni `ppm install https://github.com/coppolaf/pulsar-edit-mcp-server` | Medio | mantenere README utente come baseline documentale corrente |
| 30 | Regressione automatica dopo modifica metadata/documentazione | OK | `npm run test:unit` eseguito con esito 5/5 passati | Medio | proseguire sul refactor del monolite MCP |

Evidenze principali registrate:

* il package espone ora il repository corretto del fork corrente, evitando metadata fuorvianti verso il repo originario
* la porta di default del server MCP non collide più con il default più comune dei dev server web locali
* la sostituzione del README è stata effettuata come richiesta utente, senza compressioni del contenuto
* il README fornito dall'utente resta la nuova baseline documentale anche dove mantiene esempi o formulazioni non ancora riallineati ad altri parametri interni
* le modifiche di metadata e documentazione non hanno introdotto regressioni nei test unitari disponibili

Stato progetto:

```
FASE A IN CORSO
A.2.c STABILIZZATA
A.2.e COMPLETATA
TEST UNITARI 5/5 PASSATI
PROSSIMO TARGET: MCP REGISTRATION
```

---

# 14. Prossimo step operativo

Step operativo pronto:

```
A.2.d — Prima decomposizione di `lib/mcp-registration.js`
```

Focus:

* estrarre `editor-context` e `diff-highlighter` fuori dal monolite attuale
* separare la registrazione dei tool in gruppi `read`, `navigation`, `write`
* ridurre gli stati globali di modulo (`packageDisposables`, `activeHighlightSets`)
* predisporre un boundary più chiaro tra read-only tools e mutating tools
* mantenere compatibilità funzionale dei tool esistenti prima di introdurre il workflow `proposal/apply`
* preservare gli aggiornamenti metadata/documentazione appena stabilizzati

---

# 15. Prompt di ripartenza per la prossima sessione

All'inizio della prossima chat inviare:

```
Sto sviluppando un plugin Pulsar basato su MCP partendo dal fork
https://github.com/coppolaf/pulsar-edit-mcp-server
(originariamente derivato da drunnells/pulsar-edit-mcp-server).

Ti invio:

1) il file PULSAR_MCP_DEV_LOG.md aggiornato
2) lo ZIP completo del repository aggiornato

Ripartiamo dalla FASE A — Audit del repository.

Step corrente:
A.2.d — Prima decomposizione di `lib/mcp-registration.js`.

Obiettivo della sessione:
avviare la scomposizione reale di `lib/mcp-registration.js`,
estraendo prima i componenti infrastrutturali a minor rischio
(`editor-context`, `diff-highlighter`) e separando la registrazione
dei tool in gruppi `read`, `navigation` e `write`, mantenendo i tool
attuali funzionanti, preservando la compatibilità Pulsar già corretta
sui selettori diff editor, mantenendo allineati i metadata del fork e
aggiornando il log completo con evidenze, impatto e prossimo piano operativo.

Mantieni sempre il file PULSAR_MCP_DEV_LOG.md completo, aggiornalo
senza comprimere o omettere parti e continua a usare lo schema tabellare:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |

per tutta l’analisi e la revisione.
```


---

# 16. Sessione 7 — Hotfix compatibilità Pulsar su `editor-diff-styles.js`

Obiettivo sessione:

* analizzare l'errore di attivazione emerso su Pulsar dopo installazione reale del package
* correggere il modulo introdotto nella sessione precedente che usa sintassi ESM senza pragma Babel richiesto dal loader package di Pulsar
* aggiungere una regressione automatica per intercettare altri file `lib/**/*.js` con `import`/`export` privi di `'use babel';`
* rieseguire la suite di test unitari prima di chiudere l'hotfix

Tabella controlli:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 31 | Errore runtime analizzato a partire dal report utente | OK | stack trace in `error_report.txt` con `SyntaxError: Unexpected token 'export'` su `lib/ui/editor-diff-styles.js:1` durante activation del package | Alto | correggere il modulo affinché sia compatibile con il transpilation path di Pulsar |
| 32 | Identificata causa radice del crash | OK | `lib/ui/editor-diff-styles.js` esportava `getEditorDiffStyleSheetText()` con sintassi `export` ma senza header `'use babel';`, a differenza degli altri moduli ESM in `lib/` | Alto | allineare il file alla convenzione del package |
| 33 | Hotfix applicato sul modulo incriminato | OK | aggiunto `'use babel';` in testa a `lib/ui/editor-diff-styles.js` senza alterare API né contenuto CSS generato | Alto | mantenere pragma Babel in ogni nuovo modulo ESM sotto `lib/` |
| 34 | Regressione strutturale aggiunta | OK | nuovo test `test/ui/module-babel-pragma.test.js` che scandisce `lib/**/*.js` e fallisce se trova file con `import`/`export` privi del pragma `'use babel';` | Medio | usare il test come guardrail per i prossimi refactor |
| 35 | Verifica automatica post-fix | OK | `npm run test:unit` eseguito con esito `6/6 passati` | Medio | proseguire con A.2.d solo dopo conferma installazione utente |

Evidenze principali registrate:

* il crash non dipendeva dalla logica MCP né dal refactor architetturale, ma da una incompatibilità di caricamento del nuovo modulo `lib/ui/editor-diff-styles.js`
* nel runtime package di Pulsar i file che usano sintassi ESM nel tree `lib/` devono rispettare la convenzione `'use babel';` già usata dal progetto
* l'hotfix è minimale e non modifica i selettori CSS corretti nella sessione precedente
* il nuovo test riduce il rischio di reintrodurre lo stesso difetto durante le prossime estrazioni modulari

Stato progetto:

```
FASE A IN CORSO
A.2.c STABILIZZATA
HOTFIX COMPATIBILITÀ PULSAR APPLICATO
TEST UNITARI 6/6 PASSATI
PROSSIMO TARGET: MCP REGISTRATION
```

---

# 17. Prossimo step operativo

Step operativo pronto:

```
A.2.d — Prima decomposizione di `lib/mcp-registration.js`
```

Focus:

* estrarre `editor-context` e `diff-highlighter` fuori dal monolite attuale
* separare la registrazione dei tool in gruppi `read`, `navigation`, `write`
* ridurre gli stati globali di modulo (`packageDisposables`, `activeHighlightSets`)
* predisporre un boundary più chiaro tra read-only tools e mutating tools
* mantenere compatibilità funzionale dei tool esistenti prima di introdurre il workflow `proposal/apply`
* preservare il nuovo guardrail automatico sui moduli ESM compatibili con Pulsar

---

# 18. Prompt di ripartenza per la prossima sessione

All'inizio della prossima chat inviare:

```
Sto sviluppando un plugin Pulsar basato su MCP partendo dal fork
https://github.com/coppolaf/pulsar-edit-mcp-server
(originariamente derivato da drunnells/pulsar-edit-mcp-server).

Ti invio:

1) il file PULSAR_MCP_DEV_LOG.md aggiornato
2) lo ZIP completo del repository aggiornato

Ripartiamo dalla FASE A — Audit del repository.

Step corrente:
A.2.d — Prima decomposizione di `lib/mcp-registration.js`.

Obiettivo della sessione:
avviare la scomposizione reale di `lib/mcp-registration.js`,
estraendo prima i componenti infrastrutturali a minor rischio
(`editor-context`, `diff-highlighter`) e separando la registrazione
dei tool in gruppi `read`, `navigation` e `write`, mantenendo i tool
attuali funzionanti, preservando la compatibilità Pulsar già corretta
sui selettori diff editor e sui moduli ESM con pragma `'use babel';`,
mantenendo allineati metadata, documentazione e log completo con evidenze,
impatto e prossimo piano operativo.

Mantieni sempre il file PULSAR_MCP_DEV_LOG.md completo, aggiornalo
senza comprimere o omettere parti e continua a usare lo schema tabellare:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |

per tutta l’analisi e la revisione.
```


---

# 19. Sessione 8 — A.2.d Prima decomposizione reale di `lib/mcp-registration.js`

Obiettivo sessione:

* avviare la scomposizione reale del monolite `lib/mcp-registration.js`
* estrarre prima i componenti infrastrutturali a minor rischio (`editor-context`, `diff-highlighter`)
* separare la registrazione dei tool nei gruppi `read`, `navigation`, `write`
* mantenere invariato il comportamento operativo dei tool attuali
* preservare la compatibilità Pulsar già corretta sui selettori diff editor e sui moduli ESM con pragma `'use babel';`
* aggiornare test e log completo con evidenze, impatto e piano operativo successivo

### A.2.d — Prima decomposizione di `lib/mcp-registration.js`

Obiettivo eseguito:

separato il monolite `lib/mcp-registration.js` in una composition root minima più quattro moduli dedicati nel sottolayer `lib/mcp/tools/`, estraendo il contesto editoriale comune, l’highlighting diff e i gruppi di registrazione tool `read`, `navigation` e `write`, mantenendo il surface dei tool esistenti invariato.

#### Modifiche applicate direttamente al repository

Nuovi moduli introdotti:

* `lib/mcp/tools/editor-context.js` → accesso centralizzato a active editor/buffer, costruzione pattern di ricerca, payload documento, path/file helpers, apertura file workspace
* `lib/mcp/tools/diff-highlighter.js` → gestione incapsulata di `decorateEditedLines`, `decorateLine`, lifecycle dei marker e cleanup timer/disposable
* `lib/mcp/tools/register-read-tools.js` → registrazione dei tool read-only
* `lib/mcp/tools/register-navigation-tools.js` → registrazione dei tool di navigazione workspace/file
* `lib/mcp/tools/register-write-tools.js` → registrazione dei tool mutanti, mantenendo le mutazioni attuali ma concentrandole in un gruppo dedicato

Modulo aggiornato:

* `lib/mcp-registration.js` → ridotto a composition root che istanzia il `diffHighlighter` e delega la registrazione ai tre gruppi di tool

Nuovi test introdotti:

* `test/mcp/editor-context.test.js`
* `test/mcp/tool-registration-groups.test.js`

#### Confine architetturale raggiunto

Dopo questa sottofase `lib/mcp-registration.js` non contiene più direttamente:

* helper di accesso all’editor e al buffer ripetuti inline
* gestione dei marker diff e degli stati globali `packageDisposables` / `activeHighlightSets`
* l’elenco completo delle implementazioni dei tool nello stesso file

Il modulo ora agisce come **composition root del registry MCP**, mentre la logica applicativa è distribuita per responsabilità:

* `editor-context` per il contesto operativo editoriale
* `diff-highlighter` per gli aspetti UI/infrastrutturali di evidenziazione
* `register-read-tools` per il surface read-only
* `register-navigation-tools` per apertura file e scansione progetto
* `register-write-tools` per il surface mutating attuale

#### Correzioni strutturali incorporate

Le principali criticità evidenziate in A.2.b e pianificate in A.2.d sono state affrontate così:

* **estrazione del contesto editoriale**: il recupero di editor attivo, buffer, file path, filename e document payload è ora centralizzato in `editor-context.js`
* **estrazione dell’highlighting diff**: le funzioni `decorateEditedLines` e `decorateLine` non vivono più nel monolite; gli stati di highlight sono ora interni a `createDiffHighlighter()` e non globali di modulo
* **taxonomy iniziale dei tool resa esplicita**: la registrazione è ora divisa in gruppi `read`, `navigation`, `write`, coerenti con la classificazione emersa dall’audit
* **riduzione della superficie monolitica**: `lib/mcp-registration.js` è passato da contenitore di registry + implementation + helper diff a file di composizione minimale
* **guardrail Pulsar preservati**: tutti i nuovi moduli ESM sotto `lib/` sono stati creati con pragma `'use babel';`
* **compatibilità tool preservata**: i nomi dei tool, gli input schema e il comportamento atteso dei tool correnti restano compatibili con il client MCP già in uso

#### Limiti e decisioni di contenimento adottate

Per ridurre il rischio di regressione in questa fase:

* non è stato ancora introdotto un vero `document-write-service` separato dai registri; i tool write restano nello stesso gruppo di registrazione ma con boundary più chiaro
* non è ancora stato introdotto il workflow `proposal/apply`; i tool mutanti continuano a operare direttamente sul buffer come prima
* `get-project-files` mantiene l’attuale scansione ricorsiva grezza senza filtri/esclusioni, perché l’obiettivo della sessione era la scomposizione architetturale e non ancora l’hardening del traversal
* `mcpRegistration(server)` ritorna ora anche un oggetto con `dispose()`, ma il runtime attuale non usa ancora esplicitamente questo hook; la disponibilità del cleanup è stata preparata per gli step successivi

#### Verifiche eseguite

##### Test automatici eseguiti con esito positivo

Comando eseguito:

```bash
npm run test:unit
```

Esito:

* 9 test eseguiti
* 9 test passati
* nessun failure

Copertura incrementale aggiunta in questa sessione:

* corretto escaping/flag builder di `editor-context.buildSearchPattern(...)`
* payload documento con numerazione 1-based in `editor-context.getDocumentPayload(...)`
* verifica della separazione reale dei gruppi `read`, `navigation`, `write` tramite registrazione su server fake
* mantenimento dei guardrail preesistenti su selettori diff Pulsar e pragma `'use babel';`

##### Verifica ambiente Pulsar

Resta invariato quanto già registrato nelle sessioni precedenti:

* nell’ambiente corrente non sono disponibili binari/runtime Pulsar o Atom per eseguire gli spec editoriali legacy
* la validazione effettuata in sessione è quindi limitata ai test unitari Node e all’ispezione strutturale del repository
* la verifica end-to-end del package dentro Pulsar resta demandata al tuo test reale di installazione/attivazione

#### Valutazione A.2.d

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 11 | Registrazione tool MCP organizzata e scalabile | PARZIALE | `lib/mcp-registration.js` ridotto a composition root; introdotti `register-read-tools.js`, `register-navigation-tools.js`, `register-write-tools.js` | Alto | proseguire con ulteriore estrazione services lato write/read |
| 12 | Contratti tool chiari e coerenti | PARZIALE | taxonomy `read / navigation / write` esplicitata a livello di registrazione, ma senza policy formale di approval/apply | Alto | formalizzare capabilities e vincoli del write path |
| 14 | Tool di lettura sufficientemente sicuri e precisi | PARZIALE | i tool read ora condividono `editor-context.js`, riducendo duplicazioni e incoerenze di accesso all’editor | Medio | evolvere verso contesto documento più esplicito e meno dipendente dall’active editor |
| 15 | Tool di scrittura troppo permissivi o poco protetti | CRITICO | i tool mutanti sono ora isolati in `register-write-tools.js`, ma continuano a scrivere direttamente nel buffer | Alto | introdurre `document-write-service` e successivo workflow proposal/apply |
| 16 | Separazione tra proposta modifica e applicazione modifica | CRITICO | nessun gate di conferma ancora introdotto; la sessione ha preparato solo il boundary architetturale | Alto | progettare preview/apply esplicito come prossimo hardening del write layer |
| 17 | Preview diff e highlighting affidabili | PARZIALE | `diff-highlighter.js` incapsula marker, timer e cleanup, eliminando gli stati globali top-level precedenti | Medio | collegare il lifecycle del highlighter al teardown runtime MCP/package |
| 03 | Separazione bootstrap/runtime/business logic | PARZIALE | il registry MCP non è più monolitico; parte della business logic tool è distribuita in moduli dedicati | Alto | completare estrazione di servizi e policy comuni |
| 19 | Gestione robusta di errori, timeout e stato conversazionale | PARZIALE | il focus della sessione era il registry tool; nessun peggioramento, ma il runtime MCP continua a non usare ancora un dispose esplicito del registry | Medio | integrare cleanup e gestione errori più strutturata nel runtime |
| 24 | Regressione automatica coperta da test | OK | aggiunti `test/mcp/editor-context.test.js` e `test/mcp/tool-registration-groups.test.js`; suite `9/9` passata | Medio | mantenere copertura incrementale durante gli step successivi |
| 35 | Verifica automatica post-fix | OK | `npm run test:unit` eseguito con esito `9/9 passati` dopo la decomposizione del registry MCP | Medio | usare la suite come baseline di regressione per il prossimo refactor |

#### Esito sintetico A.2.d

La sottofase A.2.d ha avviato con successo la scomposizione reale di `lib/mcp-registration.js` senza rompere il surface dei tool esistenti.

Risultato architetturale concreto:

* il monolite registry non è più il punto unico di concentrazione di helper diff, context access e implementazione dei tool
* il repository ora possiede un sottolayer `lib/mcp/tools/` coerente con l’architettura target già impostata per `lib/chat/`
* i boundary tra tool read-only, navigation e mutating sono finalmente visibili nel codice e non solo nella documentazione di audit

Restano ancora aperti i temi ad alto impatto già previsti:

* formalizzazione del write path come servizio dedicato
* introduzione del workflow `proposal/apply`
* cleanup esplicito del registry/highlighter nel runtime MCP
* hardening di `get-project-files` e delle policy di mutazione buffer

Stato progetto:

```
FASE A IN CORSO
A.2.d ESEGUITA
MCP REGISTRY PRIMA DECOMPOSIZIONE COMPLETATA
TOOL GROUPS READ/NAVIGATION/WRITE INTRODOTTI
TEST UNITARI 9/9 PASSATI
PROSSIMO TARGET: HARDENING DEL WRITE LAYER
```

---

# 20. Prossimo step operativo

Step operativo pronto:

```
A.2.e — Consolidamento services del layer MCP tools
```

Focus:

* introdurre `document-write-service` per centralizzare le mutazioni buffer oggi disperse nei tool write
* valutare un primo `document-read-service` leggero sopra `editor-context`
* collegare in modo più esplicito il lifecycle del `diff-highlighter` al runtime MCP / package teardown
* preparare il terreno per il futuro workflow `proposal/apply` senza ancora rompere i tool esistenti
* valutare hardening iniziale di `get-project-files` con filtri/esclusioni di base

---

# 21. Prompt di ripartenza per la prossima sessione

All'inizio della prossima chat inviare:

```
Sto sviluppando un plugin Pulsar basato su MCP partendo dal fork
https://github.com/coppolaf/pulsar-edit-mcp-server
(originariamente derivato da drunnells/pulsar-edit-mcp-server).

Ti invio:

1) il file PULSAR_MCP_DEV_LOG.md aggiornato
2) lo ZIP completo del repository aggiornato

Ripartiamo dalla FASE A — Audit del repository.

Step corrente:
A.2.e — Consolidamento services del layer MCP tools.

Obiettivo della sessione:
consolidare il sottolayer `lib/mcp/tools/` appena introdotto,
centralizzando il write path in un `document-write-service`,
valutando un primo `document-read-service`, collegando meglio il
lifecycle del `diff-highlighter` al runtime MCP/package e preparando
il terreno per il futuro workflow `proposal/apply`, mantenendo i tool
attuali funzionanti, i test verdi, la compatibilità Pulsar sui selettori
 diff editor e sui moduli ESM con pragma `'use babel';`, e mantenendo
allineati metadata, documentazione e log completo con evidenze,
impatto e prossimo piano operativo.

Mantieni sempre il file PULSAR_MCP_DEV_LOG.md completo, aggiornalo
senza comprimere o omettere parti e continua a usare lo schema tabellare:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |

per tutta l’analisi e la revisione.
```


---

# 22. Sessione 9 — A.2.e Consolidamento services del layer MCP tools

Obiettivo sessione:

* consolidare il sottolayer `lib/mcp/tools/` appena introdotto
* centralizzare il write path in un `document-write-service`
* valutare e introdurre un primo `document-read-service` leggero sopra `editor-context`
* collegare meglio il lifecycle del `diff-highlighter` al runtime MCP/package
* preparare il terreno per il futuro workflow `proposal/apply` senza rompere i tool attuali
* mantenere verdi i test, la compatibilità Pulsar sui selettori diff editor e sui moduli ESM con pragma `'use babel';`
* mantenere allineati metadata, documentazione e log completo con evidenze, impatto e prossimo piano operativo

### A.2.e — Consolidamento services del layer MCP tools

Obiettivo eseguito:

consolidato il sottolayer `lib/mcp/tools/` introducendo due servizi espliciti per il documento, spostando nei servizi la logica read/write prima dispersa nei registri dei tool, mantenendo invariato il surface MCP esistente e collegando il cleanup del `diff-highlighter` al lifecycle delle sessioni/runtime MCP.

#### Modifiche applicate direttamente al repository

Nuovi moduli introdotti:

* `lib/mcp/tools/document-read-service.js` → primo service leggero sopra `editor-context`, responsabile di context lookup, ricerca testo, selezione, payload documento e metadata del file attivo
* `lib/mcp/tools/document-write-service.js` → service unico per le mutazioni buffer correnti (`replace-text`, `replace-document`, insert/delete line, undo/redo) e per il trigger dell’highlighting diff

Moduli aggiornati:

* `lib/mcp/tools/register-read-tools.js` → i tool read delegano ora a `documentReadService`
* `lib/mcp/tools/register-write-tools.js` → i tool mutanti delegano ora a `documentWriteService`
* `lib/mcp-registration.js` → composition root aggiornata per istanziare e iniettare `documentReadService`, `documentWriteService` e `diffHighlighter`
* `lib/mcp/server-runtime.js` → il runtime conserva e rilascia la registration per sessione, così il `dispose()` del registry viene richiamato in chiusura sessione e nello stop del runtime

Nuovi test introdotti:

* `test/mcp/document-read-service.test.js`
* `test/mcp/document-write-service.test.js`

#### Confine architetturale raggiunto

Dopo questa sottofase la logica concreta dei tool MCP non vive più principalmente nei file di registrazione, ma nei servizi di dominio del documento:

* `register-read-tools.js` e `register-write-tools.js` sono ora soprattutto adattatori MCP (`schema + description + binding`)
* `document-read-service.js` contiene il comportamento read-only riusabile e testabile
* `document-write-service.js` contiene il write path unico già predisposto per evolvere verso policy/gate futuri
* `mcp-registration.js` è ulteriormente ridotto a vero composition root del layer tool

Questo allinea meglio il sottolayer `lib/mcp/tools/` al pattern già adottato in `lib/chat/`.

#### Correzioni strutturali incorporate

Le principali criticità lasciate aperte in A.2.d sono state affrontate così:

* **write path centralizzato**: le mutazioni buffer oggi supportate passano tutte da `document-write-service.js` invece di essere duplicate nei singoli handler MCP
* **read path consolidato**: `document-read-service.js` fornisce un primo boundary esplicito sopra `editor-context.js`, riducendo la logica inline nei tool read
* **registri alleggeriti**: i registri MCP ora incapsulano solo il contratto tool, non più l’implementazione completa del comportamento editoriale
* **diff-highlighter agganciato meglio al lifecycle runtime**: `server-runtime.js` conserva la registration per sessione e ne richiama `dispose()` su `transport.onclose` e su `stop()`, riducendo il rischio di marker/disposable lasciati vivi oltre il ciclo della sessione MCP
* **preparazione del workflow `proposal/apply`**: il nuovo `document-write-service` offre un punto unico dove introdurre in seguito preview, capability gating, dry-run o costruzione di proposal senza cambiare il surface dei tool in un unico passo
* **guardrail Pulsar preservati**: tutti i nuovi moduli ESM introdotti sotto `lib/` mantengono il pragma `'use babel';`; la fix sui selettori diff editor non è stata alterata
* **metadata/documentazione non regressi**: nessuna modifica introdotta in questa sessione ha disallineato metadata del fork o README già stabilizzati

#### Limiti e decisioni di contenimento adottate

Per contenere il rischio in questa fase:

* `document-read-service` è volutamente leggero e non introduce ancora un vero document handle esplicito separato dall’active editor
* `document-write-service` centralizza le mutazioni ma **non** cambia ancora la policy operativa: i tool write restano mutanti e applicano direttamente sul buffer
* non è ancora presente una capability formale `proposal-only` / `apply-confirmed`
* il lifecycle del `diff-highlighter` è ora meglio collegato al runtime MCP, ma non esiste ancora un coordinator package-level più ampio per eventuali future preview persistenti multi-sessione
* `get-project-files` non è stato ancora hardenizzato in questa sottofase, perché il focus era il consolidamento services del documento

#### Verifiche eseguite

##### Test automatici eseguiti con esito positivo

Comando eseguito:

```bash
npm run test:unit
```

Esito:

* 13 test eseguiti
* 13 test passati
* nessun failure

Copertura incrementale aggiunta in questa sessione:

* `document-read-service` verifica mapping delle coordinate 1-based e costruzione del payload di contesto attorno a un’occorrenza specifica
* `document-write-service` verifica centralizzazione di `replace-text` e delle operazioni line-based con trigger dell’highlighting diff
* mantenimento dei guardrail esistenti su selettori Pulsar diff editor e pragma `'use babel';`

##### Verifica ambiente Pulsar

Resta invariato il vincolo già registrato nelle sessioni precedenti:

* nell’ambiente corrente non sono disponibili binari/runtime Pulsar o Atom per eseguire gli spec editoriali legacy
* la validazione effettuata in sessione è quindi limitata ai test unitari Node e all’ispezione strutturale del repository
* la verifica end-to-end del package dentro Pulsar resta demandata al tuo test reale di installazione/attivazione

#### Valutazione A.2.e

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 11 | Registrazione tool MCP organizzata e scalabile | PARZIALE | i registri `read` e `write` delegano ora a `document-read-service.js` e `document-write-service.js`, riducendo ulteriormente il peso logico dei file `register-*` | Alto | continuare con service boundaries più espliciti e policy layer |
| 12 | Contratti tool chiari e coerenti | PARZIALE | i contratti MCP restano invariati, ma ora sono separati dall’implementazione editoriale; manca ancora una capability formale `proposal/apply` | Alto | introdurre taxonomy operativa del write path |
| 14 | Tool di lettura sufficientemente sicuri e precisi | PARZIALE | il read path è ora consolidato in `document-read-service.js`, con logica riusabile e test dedicati | Medio | evolvere verso document context meno dipendente dall’active editor |
| 15 | Tool di scrittura troppo permissivi o poco protetti | CRITICO | `document-write-service.js` centralizza tutte le mutazioni ma non introduce ancora un gate di sicurezza o una preview obbligatoria | Alto | usare il service come punto di ingresso per proposal/apply e capability gating |
| 16 | Separazione tra proposta modifica e applicazione modifica | CRITICO | il nuovo service prepara il terreno, ma i tool write continuano a mutare direttamente il buffer | Alto | progettare un primo proposal model e apply esplicito |
| 17 | Preview diff e highlighting affidabili | PARZIALE | il `diff-highlighter` è ora smaltito anche nel teardown sessione/runtime tramite `server-runtime.js` | Medio | estendere il lifecycle management a futuri flussi preview persistenti |
| 03 | Separazione bootstrap/runtime/business logic | PARZIALE | `mcp-registration.js` è ulteriormente alleggerito; la business logic documento si sposta nei services dedicati | Alto | completare un policy layer sopra i services MCP |
| 19 | Gestione robusta di errori, timeout e stato conversazionale | PARZIALE | lato tools il teardown del runtime è più pulito grazie al dispose per sessione; resta aperto l’hardening generale error handling | Medio | affrontare error mapping e guardrail operativi nel prossimo step |
| 24 | Regressione automatica coperta da test | OK | aggiunti `test/mcp/document-read-service.test.js` e `test/mcp/document-write-service.test.js`; suite `13/13` passata | Medio | mantenere copertura incrementale durante gli step successivi |
| 35 | Verifica automatica post-fix | OK | `npm run test:unit` eseguito con esito `13/13 passati` dopo il consolidamento services del layer MCP tools | Medio | usare la suite come baseline di regressione per il prossimo refactor |

#### Esito sintetico A.2.e

La sottofase A.2.e ha consolidato con successo il sottolayer `lib/mcp/tools/` senza rompere il surface dei tool esistenti.

Risultato architetturale concreto:

* il repository possiede ora un vero doppio service layer del documento (`read` e `write`) invece di semplici gruppi di registrazione
* il write path è finalmente unico e localizzato, quindi pronto a diventare il punto di ingresso del futuro workflow `proposal/apply`
* il lifecycle del `diff-highlighter` non è più confinato solo al registry locale ma è agganciato anche al teardown delle sessioni/runtime MCP
* il pattern architetturale del repository diventa più uniforme tra `lib/chat/` e `lib/mcp/tools/`

Restano aperti i temi ad alto impatto già previsti:

* definizione di una policy formale per i tool mutanti
* introduzione di un primo modello `proposal` con `apply` separato
* hardening di `get-project-files` con filtri/esclusioni/limiti di traversal
* possibile evoluzione del read path verso un contesto documento esplicito non dipendente solo dall’active editor

Stato progetto:

```
FASE A IN CORSO
A.2.e ESEGUITA
DOCUMENT READ/WRITE SERVICES INTRODOTTI
WRITE PATH CENTRALIZZATO
DIFF-HIGHLIGHTER LIFECYCLE MIGLIORATO
TEST UNITARI 13/13 PASSATI
PROSSIMO TARGET: PREPARAZIONE WORKFLOW PROPOSAL/APPLY
```

---

# 23. Prossimo step operativo

Step operativo pronto:

```
A.2.f — Preparazione del workflow proposal/apply sul write path
```

Focus:

* introdurre una taxonomy esplicita tra mutazione immediata, proposal e apply
* progettare un primo `proposal model` o `edit-intent` sopra `document-write-service`
* valutare tool o flag MCP per differenziare `preview/propose` da `apply`
* hardenizzare inizialmente `get-project-files` con filtri/esclusioni di base e limiti di traversal
* mantenere compatibilità funzionale con i tool attuali finché il nuovo workflow non sarà stabilizzato
* preservare compatibilità Pulsar, pragma `'use babel';`, metadata del fork, README e suite di regressione verde

---

# 24. Prompt di ripartenza per la prossima sessione

All'inizio della prossima chat inviare:

```
Sto sviluppando un plugin Pulsar basato su MCP partendo dal fork
https://github.com/coppolaf/pulsar-edit-mcp-server
(originariamente derivato da drunnells/pulsar-edit-mcp-server).

Ti invio:

1) il file PULSAR_MCP_DEV_LOG.md aggiornato
2) lo ZIP completo del repository aggiornato

Ripartiamo dalla FASE A — Audit del repository.

Step corrente:
A.2.f — Preparazione del workflow proposal/apply sul write path.

Obiettivo della sessione:
preparare il primo workflow `proposal/apply` sopra il write path
ormai centralizzato nel `document-write-service`, introducendo una
prima taxonomy tra proposta e applicazione, valutando eventuali tool o
flag MCP per distinguere preview/propose da apply, iniziando anche un
hardening leggero di `get-project-files`, mantenendo i tool attuali
funzionanti, i test verdi, la compatibilità Pulsar sui selettori diff
editor e sui moduli ESM con pragma `'use babel';`, e mantenendo
allineati metadata, documentazione e log completo con evidenze,
impatto e prossimo piano operativo.

Mantieni sempre il file PULSAR_MCP_DEV_LOG.md completo, aggiornalo
senza comprimere o omettere parti e continua a usare lo schema tabellare:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |

per tutta l’analisi e la revisione.
```

---

# 25. Sessione 9 — A.2.f Preparazione del workflow `proposal/apply` sul write path

Obiettivo sessione:

* preparare il primo workflow `proposal/apply` sopra il write path ormai centralizzato nel `document-write-service`
* introdurre una prima taxonomy esplicita tra proposta e applicazione senza rompere i tool write esistenti
* valutare un meccanismo MCP leggero per distinguere preview/propose da apply
* iniziare un hardening leggero di `get-project-files`
* mantenere compatibilità Pulsar sui selettori diff editor e sui moduli ESM con pragma `'use babel';`
* mantenere suite di regressione verde e aggiornare il log completo con evidenze, impatto e piano operativo successivo

### A.2.f — Preparazione del workflow `proposal/apply` sul write path

Obiettivo eseguito:

introdotta una prima capability `proposal/apply` direttamente sopra `document-write-service`, mantenendo compatibilità dei tool write esistenti tramite un flag opzionale `executionMode`, aggiungendo il tool dedicato `apply-proposal` per applicare proposte pendenti e avviando contestualmente un primo hardening del traversal di `get-project-files` tramite service dedicato con bound ed esclusioni di base.

#### Modifiche applicate direttamente al repository

Nuovi moduli introdotti:

* `lib/mcp/tools/project-file-service.js` → servizio dedicato al traversal del workspace con esclusioni di directory note, bound di profondità e limite massimo file

Moduli aggiornati:

* `lib/mcp/tools/document-write-service.js` → introdotti `WRITE_EXECUTION_MODES`, `WRITE_OPERATION_KINDS`, supporto a proposal pendenti, apply esplicito con guardia anti-stale document e taxonomy iniziale del write path
* `lib/mcp/tools/register-write-tools.js` → tutti i tool write accettano ora `executionMode?: 'propose' | 'apply'` senza breaking change del default; aggiunto il tool MCP `apply-proposal`
* `lib/mcp/tools/register-navigation-tools.js` → `get-project-files` delega a `project-file-service` ed espone parametri opzionali di hardening (`maxDepth`, `maxFiles`, `includeHidden`, `excludedDirectories`)

Nuovi test introdotti:

* `test/mcp/project-file-service.test.js`

Test aggiornati:

* `test/mcp/document-write-service.test.js` → copertura del nuovo flusso proposal/apply e della guardia su proposal stale
* `test/mcp/tool-registration-groups.test.js` → aggiornato il surface atteso dei tool write con il nuovo `apply-proposal`

#### Decisione architetturale adottata per il primo workflow `proposal/apply`

Per questa sottofase è stata scelta una strategia **flag-first + tool di apply dedicato**.

Scelta concreta:

* i tool mutanti esistenti (`replace-text`, `replace-document`, `insert-line`, `insert-text-at-line`, `delete-line`, `delete-line-range`, `undo`, `redo`) restano utilizzabili come prima
* ciascuno di essi accetta ora un flag opzionale `executionMode`
* il valore di default resta `apply`, così il surface attuale non si rompe
* impostando `executionMode: 'propose'`, il tool non muta il buffer ma registra una proposal pendente nel `document-write-service`
* l’applicazione reale della proposal avviene poi tramite il nuovo tool `apply-proposal`

Motivazione della scelta:

* evita breaking changes nel client MCP e nel comportamento attuale
* introduce comunque una distinzione formale tra **preview/propose** e **apply**
* prepara il terreno per un futuro workflow più ricco senza dover ancora ridefinire l’intero catalogo dei tool
* mantiene il `document-write-service` come unico punto di ingresso del write path

#### Taxonomy iniziale introdotta nel write path

Nel servizio di scrittura è stata introdotta una prima taxonomy esplicita.

##### Execution mode

* `apply` → esecuzione immediata della mutazione
* `propose` → creazione di una proposal pendente, senza mutazione del documento

##### Operation kinds formalizzati

* `replace-text`
* `replace-document`
* `insert-line`
* `insert-text-at-line`
* `delete-line`
* `delete-line-range`
* `undo`
* `redo`

Questa tassonomia è ancora minimale, ma costituisce un primo boundary concreto tra:

* **intent dell’operazione**
* **modalità di esecuzione**
* **fase di applicazione reale**

#### Guardrail introdotti nel workflow proposal/apply

Sono stati aggiunti i seguenti guardrail iniziali.

##### Proposal pendenti con `proposalId`

Ogni proposal creata in modalità `propose` viene memorizzata in memoria dal `document-write-service` con:

* `proposalId`
* `kind`
* `args` normalizzati
* `baseText` del documento al momento della proposal
* timestamp di creazione

##### Anti-stale apply

`apply-proposal` verifica che il testo corrente del documento sia ancora identico al `baseText` salvato nella proposal.

Se il buffer è cambiato nel frattempo:

* la proposal non viene applicata
* il tool fallisce con messaggio esplicito che richiede refresh del contesto e creazione di una nuova proposal

Questo introduce il primo vero **gate di coerenza** sul write path.

##### No-op handling coerente

In modalità `propose`, se l’operazione non produrrebbe cambiamenti:

* non viene creata nessuna proposal
* viene ritornato il corrispondente messaggio di no-op già coerente con il comportamento apply

#### Hardening leggero introdotto su `get-project-files`

L’hardening iniziale del traversal è stato introdotto senza cambiare il nome del tool e senza rimuoverne l’utilità operativa.

##### Bound introdotti

* `maxDepth` con default controllato
* `maxFiles` con truncation esplicita
* skip dei symlink per evitare traversal anomali

##### Esclusioni di base introdotte

Directory escluse di default:

* `.git`
* `node_modules`
* `.pulsar`
* `.svn`
* `.hg`
* `dist`
* `build`
* `coverage`
* `.cache`

##### Hidden files

* i file hidden sono esclusi di default
* possono essere reinclusi con `includeHidden: true`

##### Output runtime

Il tool continua a restituire la lista newline-separated dei file, ma aggiunge anche un testo di summary che segnala se il traversal è stato completato o troncato dal limite impostato.

#### Limiti e decisioni di contenimento adottate

Per contenere il rischio in questa fase:

* le proposal sono per ora **in-memory** e legate al lifecycle del runtime MCP/sessione corrente
* non esiste ancora una preview diff persistente o navigabile lato UI dedicata alla proposal
* non è ancora presente un tool di introspezione delle proposal pendenti (`list-proposals` / `get-proposal`), perché lo step aveva come focus minimo la distinzione `propose/apply`
* `undo` e `redo` supportano già la taxonomy via `executionMode`, ma il loro valore come proposal è ancora più preparatorio che UX-completo
* `get-project-files` è hardenizzato solo in forma leggera: non sono ancora presenti allowlist per estensioni, ignore file parsing o paging strutturato

#### Verifiche eseguite

##### Test automatici eseguiti con esito positivo

Comando eseguito:

```bash
npm run test:unit
```

Esito:

* 17 test eseguiti
* 17 test passati
* nessun failure

Copertura incrementale aggiunta in questa sessione:

* `document-write-service` verifica il flusso completo `propose` → `apply-proposal`
* `document-write-service` verifica il rifiuto di apply su proposal stale dopo modifica esterna del buffer
* `project-file-service` verifica esclusione di directory pesanti e hidden file di default
* `project-file-service` verifica truncation corretta al superamento di `maxFiles`
* la suite continua a presidiare i guardrail già esistenti su selettori diff Pulsar e pragma `'use babel';`

##### Verifica ambiente Pulsar

Resta invariato il vincolo già registrato nelle sessioni precedenti:

* nell’ambiente corrente non sono disponibili binari/runtime Pulsar o Atom per eseguire gli spec editoriali legacy
* la validazione effettuata in sessione è quindi limitata ai test unitari Node e all’ispezione strutturale del repository
* la verifica end-to-end del package dentro Pulsar resta demandata al tuo test reale di installazione/attivazione

#### Valutazione A.2.f

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 12 | Contratti tool chiari e coerenti | PARZIALE | i tool write condividono ora il flag opzionale `executionMode` e il nuovo tool `apply-proposal`; la taxonomy proposal/apply è introdotta senza breaking change | Alto | consolidare la capability in metadata/tool docs e valutare tool dedicati di introspezione proposal |
| 15 | Tool di scrittura troppo permissivi o poco protetti | PARZIALE | il path immediato `apply` resta disponibile per compatibilità, ma esiste ora un percorso alternativo `propose` con apply esplicito e guardia stale | Alto | valutare in step successivo un default più conservativo o policy/config lato package |
| 16 | Separazione tra proposta modifica e applicazione modifica | PARZIALE | introdotto workflow `executionMode: 'propose'` + `apply-proposal`, con memorizzazione proposal e validazione del documento base | Alto | estendere con preview persistente, introspezione proposal e possibile gating UI |
| 17 | Preview diff e highlighting affidabili | PARZIALE | la preview non è ancora una diff UI dedicata, ma il proposal model consente di separare logical preview da apply; l’highlighting resta affidabile in fase apply | Medio | agganciare una futura preview diff editoriale al proposal layer |
| 11 | Registrazione tool MCP organizzata e scalabile | PARZIALE | `register-write-tools.js` resta ordinato pur includendo il nuovo tool `apply-proposal`; il navigation layer delega ora a `project-file-service.js` | Medio | continuare con service separation e policy layer sopra i registri |
| 14 | Tool di lettura sufficientemente sicuri e precisi | PARZIALE | nessuna regressione sul read path; il write path proposal richiede comunque ancora refresh manuale del contesto documento | Medio | valutare un accoppiamento più esplicito proposal ↔ snapshot/read context |
| 19 | Gestione robusta di errori, timeout e stato conversazionale | PARZIALE | sul write path compare una guardia anti-stale concreta; resta aperto l’hardening generale lato chat/provider e classificazione errori | Medio | aggiungere error mapping coerente tra tool proposal/apply e layer chat |
| 24 | Regressione automatica coperta da test | OK | aggiunto `test/mcp/project-file-service.test.js` e ampliato `test/mcp/document-write-service.test.js`; suite `17/17` passata | Medio | mantenere la crescita incrementale della copertura |
| 35 | Verifica automatica post-fix | OK | `npm run test:unit` eseguito con esito `17/17 passati` dopo introduzione del workflow proposal/apply e dell’hardening su traversal | Medio | usare la suite come baseline per gli step successivi |
| 36 | Hardening iniziale di `get-project-files` | OK | traversal spostato in `project-file-service.js` con bound, esclusioni di directory note, skip symlink e supporto parametri opzionali | Medio | estendere in seguito con ignore policy più ricche e paging/filtri |

#### Esito sintetico A.2.f

La sottofase A.2.f ha prodotto il primo vero ponte tra il vecchio write path immediato e un futuro workflow di modifica controllata.

Risultato architetturale concreto:

* il `document-write-service` non è più solo un esecutore di mutazioni, ma anche il primo **coordinatore semantico** tra proposta e applicazione
* i tool write esistenti restano compatibili, ma possono già essere usati in modalità `propose`
* il nuovo tool `apply-proposal` introduce il primo gate applicativo esplicito sul write path
* il workspace traversal non è più una scansione ricorsiva grezza inline, ma passa da un service dedicato con confini e limiti iniziali

Restano aperti i punti di maggiore valore per il prossimo passo:

* trasformare il proposal model in una preview più osservabile e interrogabile
* decidere se mantenere `apply` come default o introdurre una policy/config più conservativa
* aggiungere un surface MCP per ispezionare proposal pendenti e relativi dettagli
* estendere il traversal di progetto con policy più ricche di ignore/filter/paging

Stato progetto:

```
FASE A IN CORSO
A.2.f ESEGUITA
PRIMO WORKFLOW PROPOSAL/APPLY INTRODOTTO
WRITE PATH CON TAXONOMY INIZIALE
GET-PROJECT-FILES HARDENIZZATO IN FORMA LEGGERA
TEST UNITARI 17/17 PASSATI
PROSSIMO TARGET: CONSOLIDAMENTO POLICY E SURFACE DELLE PROPOSAL
```

---

# 26. Prossimo step operativo

Step operativo pronto:

```
A.2.g — Consolidamento policy proposal/apply e surface MCP delle proposal
```

Focus:

* valutare se introdurre una policy/config per rendere `propose` il path raccomandato o predefinito in alcuni contesti
* aggiungere tool di introspezione delle proposal pendenti (`list-proposals`, `get-proposal` o equivalente)
* arricchire il proposal model con dettagli più utili a una futura preview diff/UI
* migliorare l’hardening di `get-project-files` con filtri o paging più espliciti senza degradare usabilità
* mantenere verdi i test e la compatibilità Pulsar su selettori diff editor e moduli ESM con pragma `'use babel';`

---

# 27. Prompt di ripartenza per la prossima sessione

All'inizio della prossima chat inviare:

```
Sto sviluppando un plugin Pulsar basato su MCP partendo dal fork
https://github.com/coppolaf/pulsar-edit-mcp-server
(originariamente derivato da drunnells/pulsar-edit-mcp-server).

Ti invio:

1) il file PULSAR_MCP_DEV_LOG.md aggiornato
2) lo ZIP completo del repository aggiornato

Ripartiamo dalla FASE A — Audit del repository.

Step corrente:
A.2.g — Consolidamento policy proposal/apply e surface MCP delle proposal.

Obiettivo della sessione:
consolidare il primo workflow `proposal/apply` appena introdotto
sopra il `document-write-service`, valutando una policy più esplicita
per i tool write, aggiungendo un primo surface MCP per ispezionare le
proposal pendenti e arricchendo il proposal model in modo utile a una
futura preview diff/UI, continuando anche l’hardening di `get-project-files`
senza rompere i tool attuali, mantenendo i test verdi, la compatibilità
Pulsar sui selettori diff editor e sui moduli ESM con pragma `'use babel';`,
e mantenendo allineati metadata, documentazione e log completo con
 evidenze, impatto e prossimo piano operativo.

Mantieni sempre il file PULSAR_MCP_DEV_LOG.md completo, aggiornalo
senza comprimere o omettere parti e continua a usare lo schema tabellare:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |

per tutta l’analisi e la revisione.
```

---

# 28. Sessione 9 — A.2.g Consolidamento policy proposal/apply e surface MCP delle proposal

Obiettivo sessione:

* consolidare il primo workflow `proposal/apply` introdotto nella sessione precedente sopra il `document-write-service`
* rendere più esplicita la policy dei tool write distinguendo il surface proposal-capable da quello immediate-only
* aggiungere un primo surface MCP per ispezionare le proposal pendenti e leggere il dettaglio di una proposal specifica
* arricchire il proposal model con metadata più utili a una futura preview diff/UI
* continuare l’hardening di `get-project-files` senza rompere i tool esistenti
* mantenere verdi i test e preservare la compatibilità Pulsar sui selettori diff editor e sui moduli ESM con pragma `'use babel';`

### A.2.g — Consolidamento policy proposal/apply e surface MCP delle proposal

Obiettivo eseguito:

consolidato il workflow `proposal/apply` dentro `document-write-service` e nel registry write MCP, introducendo una policy operativa esplicita per i tool di scrittura, un primo surface MCP di introspezione proposal (`get-pending-proposals`, `get-proposal`, `get-write-policy`) e un proposal model arricchito con metadata documento e preview diff line-based, continuando inoltre l’hardening di `get-project-files` con traversal più deterministico e tollerante agli errori.

#### Modifiche applicate direttamente al repository

Moduli aggiornati:

* `lib/mcp/tools/document-write-service.js` → introdotta mappa esplicita delle policy per operazione (`proposal-or-apply` vs `immediate-only`), arricchito il proposal model con metadata documento, snapshot `afterText`, diff preview line-based e summary interrogabile
* `lib/mcp/tools/register-write-tools.js` → aggiunti i nuovi tool MCP `get-pending-proposals`, `get-proposal`, `get-write-policy`; aggiornate descrizioni dei tool write per esplicitare la policy operativa e l’uso raccomandato del flusso proposal/apply
* `lib/mcp/tools/project-file-service.js` → traversal reso deterministico tramite ordinamento, raccolta warning non fatali su directory non leggibili e consolidamento del comportamento fail-soft durante la scansione
* `lib/mcp/tools/register-navigation-tools.js` → summary del tool `get-project-files` arricchito con conteggio warning quando presenti

Test aggiornati o ampliati:

* `test/mcp/document-write-service.test.js`
* `test/mcp/project-file-service.test.js`
* `test/mcp/tool-registration-groups.test.js`

#### Policy write resa esplicita

Il write layer espone ora una policy chiara e ispezionabile:

* i tool di mutazione documentale (`replace-*`, `insert-*`, `delete-*`) supportano sia `executionMode: 'apply'` sia `executionMode: 'propose'`
* i tool history-based (`undo`, `redo`) sono marcati **immediate-only** e rifiutano `executionMode: 'propose'` perché dipendono dallo stato dello stack editoriale e non producono una preview stabile
* il service espone `getWritePolicySummary()` e il tool MCP `get-write-policy` per rendere la capability leggibile anche dal client/model layer

Questa scelta mantiene la compatibilità con il comportamento attuale ma evita ambiguità sul fatto che non tutti i write tool siano proposal-safe.

#### Surface MCP delle proposal introdotto

Per la prima volta il client MCP può interrogare esplicitamente lo stato del proposal layer senza passare direttamente dall’apply:

* `get-pending-proposals` → restituisce elenco compatto delle proposal pendenti con ID, kind, summary, policy, documento target e statistiche di preview
* `get-proposal` → restituisce il payload completo della proposal, incluse informazioni utili a una futura diff preview/UI
* `get-write-policy` → restituisce il contratto di policy del write layer e chiarisce quali operazioni supportano il percorso proposal/apply

Questo surface rende il workflow più osservabile e prepara un successivo aggancio sia lato UI Pulsar sia lato orchestrazione LLM.

#### Proposal model arricchito

La proposal memorizzata non contiene più solo `id`, `kind`, `args` e `baseText`, ma anche:

* `policy` dell’operazione
* `document.filename` e `document.fullPath`
* `document.baseLineCount` e `document.baseCharCount`
* `preview.afterText` per le operazioni documentali proposal-safe
* `preview.diff` con metriche line-based (`addedLineCount`, `removedLineCount`, `changedSegmentCount`) e hunk semplificati con linee coinvolte
* metadati target per operazioni line-based (`targetLineStart`, `targetLineEnd`) quando applicabili

Risultato pratico:

* il model non è ancora una UI diff editoriale completa
* ma è già abbastanza ricco da sostenere un inspector proposal, una preview diff compatta o una futura card/lista di modifiche nel pannello Pulsar

#### Hardening incrementale di `get-project-files`

Il traversal di progetto è stato ulteriormente irrobustito senza rompere il contratto attuale del tool:

* ordinamento di root ed entry per rendere l’output più deterministico e stabile nei test
* raccolta di warning non fatali quando una directory non è leggibile, evitando il fallimento dell’intera scansione
* mantenimento del behavior fail-soft e dei bound già introdotti su depth/files
* summary del tool aggiornato per evidenziare se il traversal ha incontrato warning

Non sono ancora stati introdotti paging o ignore rules avanzate, ma il service è ora più adatto a ulteriori estensioni conservative.

#### Verifiche eseguite

##### Test automatici eseguiti con esito positivo

Comando eseguito:

```bash
npm run test:unit
```

Esito:

* 19 test eseguiti
* 19 test passati
* nessun failure

Copertura incrementale aggiunta in questa sessione:

* proposal model arricchito con metadata documento e preview diff verificato in unit test
* rifiuto esplicito di `executionMode: 'propose'` per tool `undo`/`redo`
* registrazione dei nuovi tool MCP di introspezione proposal verificata
* traversal `get-project-files` verificato anche su warning non fatali da `readdir`
* guardrail preesistenti su selettori diff Pulsar e pragma `'use babel';` rimasti verdi

##### Verifica ambiente Pulsar

Resta invariato il vincolo già registrato nelle sessioni precedenti:

* nell’ambiente corrente non sono disponibili binari/runtime Pulsar o Atom per eseguire gli spec editoriali legacy
* la validazione effettuata in sessione è quindi limitata ai test unitari Node e all’ispezione strutturale del repository
* la verifica end-to-end del package dentro Pulsar resta demandata al tuo test reale di installazione/attivazione

#### Valutazione A.2.g

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 12 | Contratti tool chiari e coerenti | PARZIALE | il write layer espone ora una policy operativa leggibile via `get-write-policy`; `undo`/`redo` sono esplicitamente immediate-only | Alto | consolidare naming/metadata dei tool e valutare un contract schema più formale per capabilities |
| 15 | Tool di scrittura troppo permissivi o poco protetti | PARZIALE | il path immediato `apply` resta attivo per compatibilità, ma le operazioni proposal-safe sono distinte da quelle immediate-only e ispezionabili | Alto | valutare una config package per rendere `propose` il percorso raccomandato o predefinito dove sostenibile |
| 16 | Separazione tra proposta modifica e applicazione modifica | PARZIALE | il workflow è ora osservabile via `get-pending-proposals` e `get-proposal`, oltre che applicabile via `apply-proposal` | Alto | agganciare il proposal layer a una preview/editor UI e a un possibile approval step visivo |
| 17 | Preview diff e highlighting affidabili | PARZIALE | il proposal model contiene `afterText`, metriche diff e hunk line-based; l’highlighting apply resta invariato e affidabile | Medio | usare questi metadata come base per una preview compatta o diff card nel pannello chat/editor |
| 11 | Registrazione tool MCP organizzata e scalabile | PARZIALE | `register-write-tools.js` rimane leggibile pur includendo nuovi tool di policy e introspezione proposal | Medio | valutare successiva separazione tra write actions e proposal inspection surface |
| 14 | Tool di lettura sufficientemente sicuri e precisi | PARZIALE | il read path resta invariato; il proposal inspector aggiunge osservabilità senza toccare i read tool documentali | Medio | valutare tool read dedicato per snapshot documento/proposal allineati |
| 19 | Gestione robusta di errori, timeout e stato conversazionale | PARZIALE | il write layer ora rifiuta in modo esplicito proposal non supportate e continua a proteggere da stale apply; il traversal progetto degrada con warning e non con crash | Medio | armonizzare in seguito l’error mapping tra tool MCP e layer chat/provider |
| 24 | Regressione automatica coperta da test | OK | suite ampliata con coverage su policy write, proposal preview e warning traversal | Medio | mantenere incremento di copertura su ogni raffinamento del proposal layer |
| 35 | Verifica automatica post-fix | OK | `npm run test:unit` eseguito con esito `19/19 passati` | Medio | usare la suite come baseline per gli step successivi |
| 36 | Hardening iniziale di `get-project-files` | OK | il traversal resta bounded ma ora è anche ordinato e fail-soft su `readdir` | Medio | estendere con paging, filtri e ignore policy più ricche |
| 37 | Surface MCP di introspezione proposal disponibile | OK | introdotti `get-pending-proposals`, `get-proposal`, `get-write-policy` | Alto | collegare il surface a orchestrazione LLM e futura UI di approvazione |
| 38 | Proposal model utile a futura preview diff/UI | OK | metadata documento + `afterText` + diff preview line-based persistiti nella proposal | Alto | usare il model come base per preview editoriale o card diff persistente |

#### Esito sintetico A.2.g

La sottofase A.2.g consolida il proposal layer da feature sperimentale a **superficie architetturale leggibile**.

Risultato architetturale concreto:

* esiste ora una distinzione esplicita tra write operations proposal-safe e immediate-only
* il client MCP può interrogare lo stato delle proposal pendenti senza applicarle subito
* il proposal model contiene già informazione sufficiente per costruire una futura preview diff/UI senza dover riprogettare da zero il layer dati
* `get-project-files` continua a evolvere in sicurezza senza cambiare il contratto principale del tool

Restano aperti i punti di maggiore valore per il prossimo passo:

* decidere se introdurre una config package o una policy runtime che incentivi ancora di più il percorso `propose` rispetto a `apply`
* collegare il surface MCP delle proposal a una UI Pulsar minima di inspection/approval
* valutare se separare ulteriormente il registry write in `write-actions` vs `proposal-inspection`
* aggiungere paging/filtri più espliciti a `get-project-files` o un output più strutturato senza rompere i consumer esistenti

Stato progetto:

```
FASE A IN CORSO
A.2.g ESEGUITA
POLICY WRITE RESA ESPLICITA
SURFACE MCP DELLE PROPOSAL INTRODOTTO
PROPOSAL MODEL ARRICCHITO PER FUTURA PREVIEW/UI
GET-PROJECT-FILES ULTERIORMENTE IRROBUSTITO
TEST UNITARI 19/19 PASSATI
PROSSIMO TARGET: POLICY RUNTIME/UI DELLE PROPOSAL E PAGING/FILTRI NAVIGATION
```

---

## CHECKLIST COLLAUDO MANUALE (A.2.g / A.2.g.1)

Legenda esito:
- skipped → test non eseguito
- fail → fallito
- ok → superato

| ID | Test da effettuare | Esito | Evidenze | Note |
|----|--------------------|-------|----------|------|
| T1 | Attivazione package senza errori | ok | | |
| T2 | Start/Stop listener MCP | ok | | |
| T3 | Apertura pannello chat | ok | | |
| T4 | Messaggio chat semplice (no tool) | ok | | |
| T5 | Tool read: get-document | ok | | |
| T6 | Tool read: get-context-around | ok | | |
| T7 | Tool navigation: get-project-files (stabilità/ordine) | ok | | |
| T8 | Tool navigation: open-file | ok | | |
| T9 | Creazione proposal (no apply) | ok | | |
| T10 | Ispezione proposal pendenti | ok | | |
| T11 | Apply esplicito proposal | ok | | |
| T12 | Undo/Redo post-apply | ok | | |
| T13 | Apply su proposal stale (rifiuto atteso) | ok | | |
| T14 | Policy write coerente (propose vs immediate) | ok | | |
| T15 | Diff/highlighting corretto | ok | accodate 2 proposal; la prima viene eseguita se si indica `apply proposal-(x)` | se si chiede di applicare la proposal successiva in una sequenza ravvicinata può emergere errore provider poco parlante; test da ripetere dopo hardening error handling |
| T16 | Nessun errore console DevTools | fail | presenti warning/rumore della piattaforma Pulsar e almeno un errore rilevante del plugin su chiamate completions con status `429` mostrato senza dettaglio utile in UI | distinguere rumore host da errori plugin; harden necessario su retry/error mapping provider |
| T17 | Scoping corretto su workspace multi-root in `get-project-files` | ok | identifica correttamente il path del progetto richiesto in workspace multi-root | fix A.2.g.1 validata manualmente |
| T18 | `open-file` coerente con il progetto richiesto in workspace multi-root | ok | apre correttamente il file specifico del progetto richiesto | fix A.2.g.1 validata manualmente |

### Nota operativa

Nella prossima sessione verrà effettuata un’analisi dei risultati di collaudo rileggendo la tabella sopra.
I valori attesi nella colonna "Esito" sono:

- skipped → test non eseguito
- fail → fallito
- ok → superato

L’analisi si baserà sulle evidenze e note inserite per ogni test, al fine di guidare le prossime attività di sviluppo e hardening.

---

## 29 — Fix intermedia chat client (error handling, retry, resilienza)

### Stato
COMPLETATO (con residuo noto non bloccante)

### Sintesi
A valle delle anomalie riscontrate nei test precedenti (errori HTTP non diagnostici, comportamento opaco su failure provider), è stata introdotta una fix intermedia sul modulo chat client finalizzata a:

- migliorare il mapping degli errori HTTP (401, 429, network)
- rendere espliciti i messaggi di errore lato UI
- introdurre retry leggero su errori transient/retryable
- garantire la continuità operativa del contesto dopo failure

### Esito test validazione (chat client)

| ID | Test chat client | Esito | Evidenze | Note |
|---|---|---|---|---|
| C1 | Messaggio semplice con provider raggiungibile | ok | risposta corretta | nessuna regressione |
| C2 | Tool call semplice senza proposal | ok | get-document funzionante | loop tool invariato |
| C3 | Proposal + apply singolo | ok | apply eseguito correttamente | |
| C4 | Errore leggibile su rate limit 429 | ok | errore visibile in UI | ora diagnosticabile |
| C5 | Retry su errore transient/retryable | ok | ~2–3 sec | comportamento accettabile |
| C6 | Errore leggibile con API key invalida | ok | 401 incorrect api key | |
| C7 | Errore leggibile con endpoint errato | ok | failed to fetch | |
| C8 | Nessuna regressione nel model loading | ok* | nessun errore visibile | verifica indiretta |
| C9 | Integrità del contesto dopo errore | ok | sistema ancora operativo | |
| C10 | Apply proposal successive | fail | errore 429 su sequenza | residuo noto |

### Evidenze console
- `429 Too Many Requests` ora esplicitato
- `401 Unauthorized` correttamente intercettato
- errori di rete (`ERR_NAME_NOT_RESOLVED`) visibili

### Valutazione
La fix raggiunge l’obiettivo:

- eliminato comportamento “errore silenzioso”
- migliorata la trasparenza diagnostica
- garantita resilienza operativa del pannello chat

### Residuo noto
Persistono condizioni di rate limit (`429`) in presenza di:

- richieste ravvicinate
- sequenze multiple di proposal/apply
- contesto conversazionale con alto numero di token

Tale comportamento è ora:
- esplicito
- non distruttivo
- non bloccante

### Impatto
- UX migliorata significativamente
- debugging possibile
- affidabilità percepita aumentata

### Azione
CHIUSURA PUNTO 29  
→ demandare il residuo a fase successiva di hardening (throttling/orchestrazione)

---

## 30 — Hardening orchestrazione chat / proposal throughput

### Stato
APERTO

### Obiettivo
Gestire in modo robusto sequenze di operazioni consecutive evitando:

- saturazione API (`429`)
- chiamate ridondanti
- accumulo eccessivo di contesto
- sovrapposizione di loop assistant/tool/apply su richieste ravvicinate

### Aree di intervento

- serializzazione effettiva degli invii chat e delle apply consecutive
- eventuale coda FIFO per richieste `proposal/apply`
- debounce/throttling lato chat UI
- riduzione payload conversazionale e del contesto reinviato al provider
- gestione esplicita rate limit (`429`) con backoff/cooldown più aggressivo
- eventuale caching o riuso di risposte/tool state dove sicuro

### Razionale
La validazione operativa reale in Pulsar conferma che il limite non è più nel bootstrap del modulo né nei tool MCP stabilizzati, ma nel flusso ad alta frequenza:

chat → tool → proposal → apply → nuova richiesta → provider saturation

### Esito test operativo di riferimento

| ID | Test chat client | Esito | Evidenze | Note |
|---|---|---|---|---|
| C1 | Messaggio semplice con provider raggiungibile | ok | risposta corretta | nessuna regressione |
| C2 | Tool call semplice senza proposal | ok | `get-document` funzionante | loop tool invariato |
| C3 | Proposal + apply singolo | ok | apply eseguito correttamente | |
| C4 | Errore leggibile su rate limit 429 | ok | errore visibile in UI | diagnosi confermata anche in console |
| C5 | Retry su errore transient/retryable | ok | ~2–3 sec | comportamento accettabile |
| C6 | Errore leggibile con API key invalida | ok | `401 incorrect api key` | |
| C7 | Errore leggibile con endpoint errato | ok | `failed to fetch` | |
| C8 | Nessuna regressione nel model loading | ok* | nessun errore visibile | verifica indiretta |
| C9 | Integrità del contesto dopo errore | ok | sistema ancora operativo | |
| C10 | Apply proposal successive | fail | errore `429` su sequenza | residuo operativo confermato |

### Evidenze console operative
- attivazione del modulo completata senza anomalie bloccanti
- registrazione tool `read`, `navigation`, `write` completata correttamente
- `MCP Client Connected` e model list caricata correttamente
- i `429 Too Many Requests` compaiono in sequenze ravvicinate di `apply-proposal` e richieste successive, non nel bootstrap del package
- presenti anche warning/rumore provenienti da Pulsar/React non attribuibili direttamente al plugin

### Valutazione aggiornata
Il problema residuo è confermato come **throughput/orchestrazione verso il provider** e non come regressione dei tool MCP o del lifecycle Pulsar.

### Priorità
MEDIA-ALTA

Motivo:
- non blocca le funzionalità core singole
- impatta però il caso d’uso reale di più proposal/apply consecutive
- è stato riprodotto in ambiente operativo reale, non solo ipotizzato dai test locali

---

## VALIDAZIONE COMPLESSIVA (A.2.g)

### Stato
VALIDATO IN OPERATIVO (con hardening residuo aperto su A.2.h)

### Esito test principali

| ID | Test | Esito |
|---|---|---|
| T1–T13 | Workflow base + proposal/apply | ok |
| T14 | Policy write | ok |
| T15 | Diff/highlighting | ok (con nota minore) |
| T16 | Console error | parziale (rumore Pulsar + `429` gestito) |
| T17 | Multi-root get-project-files | ok |
| T18 | open-file coerente con progetto | ok |
| C1–C9 | Validazione operativa chat/tool/proposal/apply | ok |
| C10 | Apply proposal successive | fail (`429` su sequenza) |

### Sintesi
- workflow `proposal/apply` validato end-to-end su singola operazione
- tool navigation robusti (multi-root risolto)
- attivazione del package e bootstrap MCP validati in Pulsar reale
- chat client stabilizzato lato error handling e recupero dopo errore
- residui confinati a throughput/orchestrazione nelle sequenze ravvicinate

### Conclusione di fase
La fase corrente può considerarsi **validata con residuo noto e riprodotto**, quindi il passo successivo non è una nuova analisi strutturale generale ma un intervento mirato di hardening sull’orchestrazione chat/proposal/apply.

---

# 31. Sessione 9 — Validazione operativa reale in Pulsar

Obiettivo sessione:

* verificare in ambiente Pulsar reale l’attivazione del package dopo le ultime correzioni
* eseguire in modo sistematico i test C1–C10 sul chat client
* raccogliere esiti, evidenze console e confermare o smentire il residuo noto sui `429`

Tabella controlli:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 36 | Attivazione package in Pulsar dopo reinstallazione | OK | il modulo si attiva senza anomalie bloccanti all'avvio; bootstrap MCP e caricamento modelli visibili in console | Alto | considerare stabilizzato il path di activation corrente |
| 37 | Validazione operativa C1–C9 | OK | file esiti test: C1–C9 tutti positivi; proposal/apply singolo, tool read, retry e gestione errori confermati | Alto | mantenere invariati tool MCP e flussi già stabilizzati |
| 38 | Riproduzione residuo C10 in ambiente reale | OK (residuo confermato) | `C10` fallisce con `429 Too Many Requests` su sequenze ravvicinate di proposal/apply | Alto | concentrare il prossimo intervento sul throughput/orchestrazione |
| 39 | Separazione tra rumore console Pulsar e segnali del plugin | OK | presenti warning React/Pulsar generici, distinti dai `429`, `401` e `failed to fetch` del plugin | Medio | continuare a filtrare i warning non pertinenti nella diagnosi |
| 40 | Conferma della causa prevalente del residuo | PARZIALE | la console mostra più `POST /v1/chat/completions 429` durante apply e richieste ravvicinate; i tool MCP completano però il proprio path locale | Alto | introdurre serializzazione/coda/cooldown per ridurre la pressione sul provider |

Evidenze principali registrate:

* il package non presenta più anomalie di attivazione dopo reinstallazione da console Pulsar
* il bootstrap del client MCP e la registrazione dei tool risultano coerenti con lo stato architetturale attuale
* `C1–C9` confermano che il comportamento nominale del client chat è corretto
* `C10` conferma in modo riproducibile che il collo di bottiglia è il numero di completion ravvicinate verso il provider
* il problema residuo è quindi da trattare nel layer di orchestrazione, non nel registry tool né nel lifecycle del package

Stato progetto:

```
FASE A IN CORSO
A.2.g VALIDATA IN OPERATIVO
A.2.h ANCORA APERTA
C1-C9 OK
C10 FAIL RIPRODOTTO
PROSSIMO TARGET: THROUGHPUT / RATE LIMIT HARDENING
```

---

# 32. Prossimo step operativo

Step operativo pronto:

```
A.2.h — Hardening orchestrazione chat/proposal e gestione throughput write
```

Focus:

* impedire overlap di invii chat mentre una richiesta precedente è ancora attiva
* valutare coda FIFO o serializzazione esplicita per `proposal/apply`
* introdurre cooldown/backoff più forte dopo `429`
* ridurre il contesto reinviato al provider nelle sequenze lunghe
* mantenere stabili i tool MCP, la compatibilità Pulsar sui selettori diff editor e i moduli ESM con pragma `'use babel';`
* lasciare invariato il file `PULSAR_MCP_DEV_LOG.md` per i minor typo fix non architetturali, salvo quando incidono sul comportamento operativo

---

# 33. Note di allineamento per gli step successivi

Indicazioni aggiornate:

* non riaprire i punti già validati su activation, registry MCP, navigation tools o proposal/apply singolo, salvo regressioni esplicite
* usare come baseline i risultati C1–C9 positivi e C10 negativo riprodotto
* considerare i warning React/Pulsar di console come rumore esterno, salvo evidenza contraria
* misurare il successo del prossimo intervento soprattutto sulla riduzione dei `429` nelle sequenze ravvicinate, non solo sulla correttezza del caso semplice

---

# 34. Prompt di ripartenza per la prossima sessione

All'inizio della prossima chat inviare:

```text
Sto sviluppando un plugin Pulsar basato su MCP partendo dal fork
https://github.com/coppolaf/pulsar-edit-mcp-server
(originariamente derivato da drunnells/pulsar-edit-mcp-server).

Ti invio:

1) il file PULSAR_MCP_DEV_LOG.md aggiornato
2) lo ZIP completo del repository aggiornato

Ripartiamo dalla FASE A — Audit del repository.

Step corrente:
A.2.h — Hardening orchestrazione chat/proposal e gestione throughput write.

Obiettivo della sessione:
partire dalla validazione operativa reale già eseguita in Pulsar, con package che si attiva correttamente, test C1–C9 positivi e C10 ancora fallito per `429 Too Many Requests` nelle sequenze ravvicinate di proposal/apply, e intervenire sul punto 30 introducendo se opportuno serializzazione o coda FIFO degli invii chat/apply, throttling o debounce lato UI, cooldown/backoff più robusto dopo `429`, e riduzione del contesto inviato al provider, senza rompere i tool MCP già stabilizzati, mantenendo i test verdi, la compatibilità Pulsar sui selettori diff editor e sui moduli ESM con pragma `'use babel';`, e mantenendo allineati metadata, documentazione e log completo con evidenze, impatto e prossimo piano operativo.

Contesto minimo da rileggere nel log prima di intervenire:
- chiusura del punto 29 con validazione del chat client
- validazione operativa reale C1–C10 con focus su C10 fail
- evidenze console relative a bootstrap corretto, `429`, `401` e network error
- stato attuale dei tool `proposal/apply`, `get-pending-proposals` e navigation
- distinzione tra warning generici Pulsar/React e segnali reali del plugin

Mantieni sempre il file PULSAR_MCP_DEV_LOG.md completo, aggiornalo
senza comprimere o omettere parti e continua a usare lo schema tabellare:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |

per tutta l’analisi e la revisione.
```

---

# 35. Sessione 10 — A.2.h Hardening orchestrazione chat/proposal e validazione operativa post-hardening

Obiettivo sessione:

* intervenire sul residuo operativo confermato in `C10` (`429 Too Many Requests` su sequenze ravvicinate di proposal/apply)
* introdurre serializzazione effettiva delle completion built-in chat verso il provider
* rafforzare cooldown/backoff e timeout lato provider
* ridurre il contesto reinviato al provider senza toccare il surface MCP già stabilizzato
* mantenere verdi i test Node e preservare compatibilità Pulsar sui selettori diff editor e sui moduli ESM con pragma `'use babel';`
* analizzare il nuovo rerun reale C1–C10 eseguito in Pulsar dopo l'hardening e aggiornare il piano operativo

### A.2.h — Hardening orchestrazione chat/proposal e gestione throughput write

Obiettivo eseguito:

introdotto un primo hardening concreto del layer chat built-in che serializza le completion verso il provider, applica un gap minimo tra richieste consecutive, propaga un cooldown più forte dopo errori retryable come `429`, aggiunge timeout/retry dinamici guidati da configurazione e riduce il payload di contesto inviato al provider mantenendo intatti i tool MCP `proposal/apply`, `get-pending-proposals`, `get-proposal`, `get-write-policy` e i tool di navigation/read.

#### Modifiche applicate direttamente al repository

Moduli aggiornati:

* `lib/chat-functions.js` → introdotta una `requestScheduler` condivisa nel facade chat e collegata al `modelClient`; aggiunta diagnostica runtime minima (`pendingRequests`, `nextAvailableAt`)
* `lib/chat/model-client.js` → le completion passano ora attraverso serializzazione FIFO lato scheduler; retry/backoff letti a runtime da configurazione; supporto timeout provider; mappatura più robusta di timeout/network error; rispetto di `Retry-After` quando presente
* `lib/chat/chat-orchestrator.js` → il payload inviato al provider viene costruito tramite `conversationState.getMessagesForProvider(...)` invece di reinviare sempre tutta la history grezza
* `lib/chat/conversation-state.js` → introdotti slicing per ultimi turni utente e truncation del contenuto dei messaggi `tool` per ridurre il contesto reinviato mantenendo il prompt di sistema
* `lib/chat/request-scheduler.js` → esteso con conteggio pendenti oltre a serializzazione FIFO e cooldown post-errore
* `lib/chat-panel.js` → piccolo debounce/guardrail UI: il pulsante Send viene disabilitato mentre una richiesta è in corso e aggiornato visivamente durante la coda locale
* `package.json` → metadata versione portati a `0.0.16`; aggiunti al `configSchema` i parametri runtime del layer chat (`providerTimeoutMs`, `chatMaxRetries`, `chatRetryBaseDelayMs`, `chatRequestMinGapMs`, `chatContextMessageLimit`, `chatToolContentCharLimit`)

Test aggiornati o ampliati:

* `test/chat/conversation-state.test.js`
* `test/chat/model-client.test.js`

#### Boundary operativo raggiunto

Con questo intervento il package non cambia il surface MCP stabilizzato né il workflow `proposal/apply`, ma cambia il modo in cui il built-in chat raggiunge il provider:

* le completion non partono più in overlap libero, ma passano in una coda FIFO con gap minimo configurabile
* gli errori retryable (`429`, timeout, `5xx`, transient network error) alimentano un cooldown più robusto prima del tentativo successivo
* il provider non riceve più sempre l'intera history completa, ma una finestra dei turni utente più recenti con contenuto dei tool messages troncato

Questo sposta l'hardening sul punto realmente emerso dalla validazione operativa C10: **throughput/orchestrazione provider-side**, non il registry MCP né il lifecycle del package.

#### Verifiche automatiche eseguite prima del rerun reale

Comando eseguito:

```bash
npm run test:unit
```

Esito:

* 32 test eseguiti
* 32 test passati
* nessun failure

Copertura incrementale aggiunta in questa sessione:

* costruzione del payload provider dal conversation store con slicing per ultimi turni utente
* truncation dei tool message nel payload inviato al provider
* passaggio delle completion attraverso la scheduler quando presente
* mantenimento dei guardrail preesistenti su compatibilità Pulsar CSS e pragma `'use babel';`

#### Validazione operativa reale post-hardening C1–C10

È stato eseguito un nuovo rerun manuale in Pulsar reale usando la sequenza C1–C10.

Esito complessivo:

| ID | Test chat client | Esito | Evidenze | Note |
|---|---|---|---|---|
| C1 | Messaggio semplice con provider raggiungibile | ok | risposta corretta | nessuna regressione |
| C2 | Tool call semplice senza proposal | ok | `get-document` funzionante | loop tool invariato |
| C3 | Proposal + apply singolo | ok | apply eseguito correttamente | workflow singolo confermato |
| C4 | Errore leggibile su rate limit `429` | ok | errore visibile in UI dopo almeno 5 tentativi visibili in console | retry/error mapping operativo; resta da ridurre l'esaurimento dei retry in sequenze lunghe |
| C5 | Retry su errore transient/retryable | ok | risposta in circa 2–3 secondi | comportamento accettabile |
| C6 | Errore leggibile con API key invalida | ok | `401 incorrect api key` | diagnostica confermata |
| C7 | Errore leggibile con endpoint errato | ok | `failed to fetch` | diagnostica confermata |
| C8 | Nessuna regressione nel model loading | ok | nessun errore visibile | verifica indiretta |
| C9 | Integrità del contesto dopo errore | ok | sistema ancora operativo | recupero dopo errore confermato |
| C10 | Apply proposal successive | fail | errore `429` su sequenza | successo parziale: una sequenza con due proposal successive in ordine invertito è riuscita; un passaggio successivo fallisce ancora su `429` |

#### Evidenze console post-hardening

Dalla traccia `console.log` emergono questi segnali:

* il package si attiva e registra correttamente i tool `read`, `navigation` e `write`; `MCP Client Connected` conferma il bootstrap MCP locale
* il model loading funziona e la lista modelli viene recuperata
* le chiamate `/v1/chat/completions` passano effettivamente dal nuovo path `request-scheduler.js` durante i retry, quindi la FIFO risulta integrata nel flusso operativo reale
* `apply-proposal` viene invocato correttamente sui proposal osservati (`proposal-1`, `proposal-2`, `proposal-3`, `proposal-4`)
* il residuo `429 Too Many Requests` si manifesta ancora dopo `apply-proposal`, nel secondo tratto del loop assistant/tool/assistant, cioè quando il client prova a richiedere al provider la risposta finale successiva all'esecuzione locale del tool
* sono presenti warning o rumore di piattaforma Pulsar/React/GitHub già noti e non direttamente attribuibili al plugin
* compare anche un `TypeError: Invalid Point: (null, null)` nel runtime Pulsar/text-buffer: va monitorato, ma nel rerun non risulta il blocker primario dei test C1–C10 rispetto al residuo `429`

#### Interpretazione tecnica aggiornata

Il primo hardening A.2.h ha migliorato la robustezza generale e ha evitato regressioni sui casi C1–C9, ma **non chiude C10**.

La causa residua non sembra più essere solo overlap libero tra richieste UI, perché lo stack mostra il passaggio dalla scheduler. Il punto critico residuo è più specifico:

```text
user request → assistant tool call → apply-proposal locale → nuova completion per risposta finale → 429
```

Quindi il problema residuo è nel numero di roundtrip provider richiesti dal loop dopo tool execution, specialmente quando i tool sono deterministici e già producono un risultato sufficiente lato MCP.

In particolare, per `apply-proposal` il client potrebbe evitare o differire la completion finale del provider e mostrare direttamente un messaggio locale derivato dal risultato tool, riducendo in modo netto il numero di chiamate ravvicinate.

#### Valutazione A.2.h aggiornata dopo test reali

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 41 | Serializzazione delle completion built-in chat verso provider | OK | stack console con `request-scheduler.js` su chiamate `/v1/chat/completions`; il path scheduler è realmente coinvolto | Alto | mantenere la FIFO come baseline del layer chat |
| 42 | Cooldown/backoff più robusto dopo `429` e retryable errors | PARZIALE | `C4` mostra errore leggibile dopo almeno 5 tentativi; in `C10` i retry vengono comunque esauriti con `429` | Alto | aumentare/raffinare cooldown globale, jitter e politiche di retry per sequenze lunghe |
| 43 | Riduzione payload conversazionale verso il provider | PARZIALE | C1–C9 non regrediscono; C10 continua a fallire, quindi la sola riduzione contesto non basta | Alto | mantenere slicing/truncation ma affiancare riduzione dei roundtrip provider |
| 44 | Debounce/guardrail lato UI sugli invii | PARZIALE | il pulsante Send è protetto durante la richiesta corrente, ma C10 fallisce dentro un singolo loop assistant/tool/assistant | Medio | non limitarsi al debounce UI; intervenire nel loop orchestrator |
| 45 | Compatibilità e stabilità del surface MCP già validato | OK | tool registration e `apply-proposal` risultano operativi; C1–C3 e C8–C9 positivi | Alto | mantenere invariati i tool salvo regressioni esplicite |
| 46 | Regressione automatica dopo hardening | OK | baseline Node `32/32` passati prima del rerun reale | Alto | conservare la suite come guardrail |
| 47 | Validazione operativa C1–C9 post-hardening | OK | test manuali C1–C9 tutti positivi | Alto | considerare stabilizzati i casi nominali e gli error path diagnosticati |
| 48 | Validazione operativa C10 post-hardening | FAIL | `C10` fallisce ancora con `429` su sequenze successive, pur con un primo caso parzialmente riuscito | Alto | aprire secondo hardening mirato su riduzione roundtrip provider post-tool |

Evidenze principali registrate:

* A.2.h è efficace come hardening generale ma insufficiente per chiudere il caso peggiore C10
* il path MCP locale e i tool `proposal/apply` non risultano la causa primaria del fallimento residuo
* il problema è ora più precisamente localizzato nel secondo completamento provider dopo l'esecuzione del tool
* il prossimo intervento deve ridurre le completion non strettamente necessarie dopo tool deterministici, prima di aumentare ulteriormente i delay
* i warning generici Pulsar/React restano rumore, mentre i `429` sono il segnale reale da trattare

Stato progetto:

```text
FASE A IN CORSO
A.2.h IMPLEMENTATA E VALIDATA PARZIALMENTE IN OPERATIVO
C1-C9 OK POST-HARDENING
C10 ANCORA FAIL SU 429
SCHEDULER FIFO ATTIVA MA INSUFFICIENTE
PROSSIMO TARGET: RIDUZIONE ROUNDTRIP PROVIDER POST-TOOL
```

---

# 36. Prossimo step operativo

Step operativo pronto:

```text
A.2.i — Secondo hardening orchestrazione chat: short-circuit post-tool e riduzione roundtrip provider
```

Focus:

* intervenire nel `chat-orchestrator` per ridurre le completion provider non necessarie dopo tool deterministici
* introdurre uno short-circuit locale per `apply-proposal` e, se opportuno, per altri tool write/read che restituiscono già un risultato sufficiente
* mostrare in UI un messaggio locale coerente dopo `apply-proposal` riuscito, senza obbligare sempre una seconda completion assistant
* distinguere chiaramente tra errore di apply locale e fallimento della sola risposta finale provider
* valutare una modalità di batching/serializzazione semantica per richieste del tipo “applica proposal 2 e 3”
* rafforzare il cooldown globale solo se il taglio dei roundtrip non è sufficiente
* mantenere invariati i tool MCP già stabilizzati e il workflow `proposal/apply` lato registry
* mantenere verdi i test Node e aggiungere test mirati sullo short-circuit post-tool
* ripetere poi la sequenza C1–C10 in Pulsar reale con focus su C10

Criterio di successo del prossimo step:

* `C1–C9` restano ok
* `C10` non produce più `429` nel caso ordinario di proposal/apply successive oppure degrada in modo esplicito e non distruttivo senza perdere lo stato delle proposal applicate
* la UI distingue “apply eseguito” da “sintesi finale provider non disponibile”

---

# 37. Prompt di ripartenza per la prossima sessione

All'inizio della prossima chat inviare:

```text
Sto sviluppando un plugin Pulsar basato su MCP partendo dal fork
https://github.com/coppolaf/pulsar-edit-mcp-server
(originariamente derivato da drunnells/pulsar-edit-mcp-server).

Ti invio:

1) il file PULSAR_MCP_DEV_LOG.md aggiornato
2) lo ZIP completo del repository aggiornato

Ripartiamo dalla FASE A — Audit del repository.

Step corrente:
A.2.i — Secondo hardening orchestrazione chat: short-circuit post-tool e riduzione roundtrip provider.

Obiettivo della sessione:
partire dal rerun reale post-hardening A.2.h in Pulsar: C1–C9 risultano positivi, C10 resta fallito per `429 Too Many Requests` nelle sequenze ravvicinate di proposal/apply, ma la console conferma che la FIFO `request-scheduler` è effettivamente nel path delle completion e che il residuo si manifesta soprattutto dopo `apply-proposal`, quando il loop assistant/tool/assistant tenta una nuova completion provider per generare la risposta finale.

Intervenire quindi sul layer `chat-orchestrator` / `model-client` senza modificare il surface MCP stabilizzato, introducendo se opportuno uno short-circuit locale post-tool per `apply-proposal` e per i tool deterministici che restituiscono già un risultato sufficiente, così da mostrare un messaggio UI locale coerente e ridurre i roundtrip provider non indispensabili. Valutare anche batching semantico per richieste di apply multiple, cooldown globale più conservativo solo se necessario, e distinzione esplicita tra apply locale riuscito e fallimento della sola sintesi finale provider.

Contesto minimo da rileggere nel log prima di intervenire:
- chiusura del punto 29 con validazione del chat client
- validazione operativa reale C1–C10 pre-hardening con C10 fail
- implementazione A.2.h: FIFO scheduler, min gap, retry/backoff, timeout, riduzione contesto provider
- rerun reale post-hardening: C1–C9 ok, C10 ancora fail con `429`
- console post-hardening: tool registration ok, `MCP Client Connected`, model list ok, `request-scheduler.js` presente nello stack dei retry, `apply-proposal` eseguito prima del `429`
- distinzione tra warning generici Pulsar/React/GitHub e segnali reali del plugin
- stato dei tool `proposal/apply`, `get-pending-proposals`, `get-proposal`, `get-write-policy` e navigation da mantenere stabile

Vincoli:
- non riaprire il registry MCP salvo regressioni esplicite
- non cambiare i contratti dei tool già stabilizzati
- mantenere i test Node verdi e aggiungere test mirati allo short-circuit post-tool
- preservare compatibilità Pulsar sui selettori diff editor e sui moduli ESM con pragma `'use babel';`
- mantenere allineati metadata, documentazione e log completo con evidenze, impatto e prossimo piano operativo

Mantieni sempre il file PULSAR_MCP_DEV_LOG.md completo, aggiornalo
senza comprimere o omettere parti e continua a usare lo schema tabellare:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |

per tutta l'analisi e la revisione.
```

---

## Sessione 33 — A.2.i Secondo hardening orchestrazione chat: short-circuit post-tool

Obiettivo sessione:

* ripartire dal rerun reale post-hardening A.2.h, dove C1–C9 risultano positivi e C10 resta fallito su `429 Too Many Requests`
* intervenire sul layer `chat-orchestrator` / `model-client` senza modificare il surface MCP stabilizzato
* ridurre i roundtrip provider non indispensabili dopo tool deterministici, in particolare `apply-proposal`
* distinguere esplicitamente il successo dell'apply locale dal fallimento della sola sintesi finale provider
* mantenere verdi i test Node e aggiungere copertura mirata sullo short-circuit post-tool

### A.2.i — Secondo hardening orchestrazione chat: short-circuit post-tool e riduzione roundtrip provider

Obiettivo eseguito:

introdotto uno short-circuit locale nel loop `assistant -> tool -> assistant` per i tool deterministici che restituiscono già un risultato sufficiente, con target primario `apply-proposal`. Dopo l'esecuzione locale del tool, l'orchestrator ora può generare e renderizzare una risposta assistant locale senza richiedere una seconda completion provider. Questo riduce il caso emerso in C10: apply locale riuscito, seguito da una nuova completion provider non indispensabile che può saturare il provider e produrre `429`.

#### Modifiche applicate direttamente al repository

Nuovo modulo introdotto:

* `lib/chat/post-tool-response.js` → policy locale per identificare tool deterministici post-tool e costruire una risposta UI locale coerente a partire dal risultato MCP

Modulo aggiornato:

* `lib/chat/chat-orchestrator.js` → dopo l'esecuzione dei tool, raccoglie le execution locali; se la policy post-tool consente lo short-circuit, appende un messaggio assistant locale allo stato conversazionale, renderizza il risultato in UI e ritorna senza chiamare nuovamente il provider

Test introdotti/aggiornati:

* `test/chat/post-tool-response.test.js` → verifica che `apply-proposal` venga considerato short-circuitabile e che i read tool non deterministici, come `get-document`, continuino a passare dal provider loop
* `test/chat/chat-orchestrator.test.js` → aggiunto test mirato che simula una tool call `apply-proposal` e verifica che venga effettuata una sola completion provider, non due

#### Boundary architetturale raggiunto

L'intervento non cambia:

* nomi tool MCP
* input schema dei tool MCP
* payload restituiti dai tool MCP
* workflow proposal/apply già stabilizzato
* registry MCP e tool registration
* scheduler FIFO introdotta in A.2.h

L'intervento cambia solo il comportamento del built-in chat client dopo una tool call deterministica:

* il tool viene eseguito normalmente via MCP
* il risultato tool viene comunque salvato nella conversation history come messaggio `tool`
* quando il risultato è autosufficiente, viene aggiunto un messaggio `assistant` locale
* la UI mostra il risultato locale invece di attendere una sintesi provider
* il provider non riceve il secondo roundtrip `assistant/tool/assistant` per il caso short-circuitato

#### Decisioni operative

* `apply-proposal` è stato incluso come primo target dello short-circuit perché è il caso direttamente correlato al residuo C10 e restituisce già un esito operativo sufficiente dal write service.
* `get-write-policy` è stato incluso come tool deterministico informativo, perché il suo output è una policy locale stabile e può essere mostrato senza sintesi provider.
* I read tool generali e i navigation tool restano fuori dallo short-circuit, perché spesso richiedono interpretazione, riassunto o ragionamento del modello sul contenuto restituito.
* Non è stato aumentato ulteriormente il cooldown globale in questa sessione: la priorità è ridurre il numero di completion, non mascherare roundtrip superflui con attese più lunghe.
* Il batching semantico di apply multipli è stato valutato ma rimandato: richiederebbe una policy più esplicita sul trattamento di più proposal e sul loro ordine di applicazione, mentre il residuo C10 può essere ridotto senza cambiare il contratto MCP.

#### Verifiche eseguite

Comandi mirati eseguiti con esito positivo:

```bash
node --test test/chat/post-tool-response.test.js test/chat/chat-orchestrator.test.js
```

Esito:

* 4 test eseguiti
* 4 test passati
* nessun failure

Verifica incrementale dell'intera suite Node disponibile eseguita per gruppi/filenames a causa di instabilità del runner aggregato nell'ambiente container corrente:

* `test/chat/chat-orchestrator.test.js` → 2/2 passati
* `test/chat/chat-syntax-static-check.test.js` → 1/1 passato
* `test/chat/conversation-state.test.js` → 3/3 passati
* `test/chat/model-client.test.js` → 3/3 passati
* `test/chat/post-tool-response.test.js` → 2/2 passati
* `test/chat/request-scheduler.test.js` → 2/2 passati
* `test/chat/tool-catalog.test.js` → 1/1 passato
* `test/mcp/document-read-service.test.js` → 2/2 passati
* `test/mcp/document-write-service.test.js` → 5/5 passati
* `test/mcp/editor-context.test.js` → 4/4 passati
* `test/mcp/project-file-service.test.js` → 7/7 passati
* `test/mcp/tool-registration-groups.test.js` → 1/1 passato
* `test/ui/editor-diff-styles.test.js` → 1/1 passato
* `test/ui/module-babel-pragma.test.js` → 1/1 passato

Totale verificato:

* 35 test Node eseguiti
* 35 test passati
* nessun failure rilevato nei file test eseguiti

Nota ambiente:

* il comando aggregato `npm run test:unit` è stato tentato, ma nell'ambiente container corrente è rimasto appeso dopo l'avvio TAP senza completare entro il timeout dello strumento; i test sono quindi stati rieseguiti per file/gruppi con `node --test`, ottenendo esito positivo completo sui 35 test disponibili
* resta invariata l'impossibilità di eseguire spec Pulsar/Atom end-to-end in questo ambiente per assenza del runtime editoriale

#### Valutazione A.2.i

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 49 | Riduzione roundtrip provider post-tool per `apply-proposal` | OK | `chat-orchestrator.js` ora short-circuita dopo tool deterministici e non richiama il provider per la sintesi finale locale | Alto | validare in Pulsar reale sulla sequenza C10 |
| 50 | Distinzione tra apply locale riuscito e sintesi provider finale | OK | il risultato MCP di `apply-proposal` viene renderizzato come messaggio assistant locale; il successo dell'apply non dipende più da una seconda completion provider | Alto | mantenere separazione esplicita negli error path futuri |
| 51 | Stabilità del surface MCP proposal/apply | OK | nessuna modifica a `register-write-tools.js`, `document-write-service.js`, tool names o schema MCP | Alto | non riaprire registry salvo regressioni esplicite |
| 52 | Policy locale per tool deterministici | PARZIALE | introdotto `post-tool-response.js` con target iniziali `apply-proposal` e `get-write-policy`; read/navigation tool restano provider-driven | Medio | estendere solo dopo evidenze operative, evitando output UI grezzo non utile |
| 53 | Batching semantico apply multipli | RIMANDATO | valutato ma non implementato per non cambiare ordine/semantica delle proposal né il contratto MCP | Medio | considerare solo se C10 resta fragile dopo short-circuit |
| 54 | Cooldown globale più conservativo | RIMANDATO | non aumentato perché A.2.i riduce la domanda verso provider invece di incrementare attese generiche | Medio | rivalutare dopo rerun reale C1–C10 |
| 55 | Regressione automatica mirata short-circuit | OK | aggiunti test su `post-tool-response` e `chat-orchestrator`; caso `apply-proposal` verifica una sola completion provider | Alto | mantenere come guardrail del built-in chat loop |
| 56 | Suite Node disponibile dopo A.2.i | OK | 35/35 test passati eseguendo i file test per gruppi; nessun failure rilevato | Alto | rieseguire anche `npm run test:unit` in ambiente locale se il runner aggregato non si blocca |
| 57 | Compatibilità Pulsar ESM e CSS preservata | OK | nuovo modulo `lib/chat/post-tool-response.js` include pragma `'use babel';`; test pragma e selector diff passati | Medio | mantenere guardrail automatici |

#### Evidenze principali registrate

* il residuo C10 non richiede una modifica al registry MCP né ai contratti dei tool `proposal/apply`
* lo short-circuit sposta la responsabilità della risposta finale per `apply-proposal` dal provider al client locale, quando il risultato tool è già sufficiente
* il loop assistant/tool/assistant conserva comunque una history coerente perché il messaggio `tool` e il messaggio `assistant` locale vengono appendati allo store conversazionale
* il primo effetto atteso nel rerun reale è la riduzione da due completion provider a una sola per l'apply proposal short-circuitato
* eventuali `429` residui dopo questa modifica andranno interpretati come rate limit sulla prima completion di decisione tool o su sequenze utente molto ravvicinate, non più sulla sintesi finale post-apply

Stato progetto:

```text
FASE A IN CORSO
A.2.h IMPLEMENTATA E VALIDATA PARZIALMENTE IN OPERATIVO
A.2.i IMPLEMENTATA
SHORT-CIRCUIT POST-TOOL ATTIVO PER APPLY DETERMINISTICI
TEST NODE 35/35 PASSATI PER FILE/GRUPPI
PROSSIMO TARGET: RERUN REALE C1-C10 IN PULSAR
```

---

# Prossimo step operativo

Step operativo pronto:

```text
A.2.i.1 — Rerun reale C1–C10 post short-circuit
```

Focus:

* reinstallare/ricaricare il package aggiornato in Pulsar
* rieseguire la sequenza C1–C10 già usata dopo A.2.h
* verificare specificamente C10 con due o più `apply-proposal` ravvicinati
* controllare in console che, dopo `apply-proposal`, non parta una seconda chiamata `/v1/chat/completions` per la sola sintesi finale
* distinguere eventuali failure della prima completion provider da failure post-tool ormai short-circuitata
* mantenere invariati registry MCP e contratti tool salvo regressioni esplicite

---

# Prompt di ripartenza per la prossima sessione

All'inizio della prossima chat inviare:

```text
Sto sviluppando un plugin Pulsar basato su MCP partendo dal fork
https://github.com/coppolaf/pulsar-edit-mcp-server
(originariamente derivato da drunnells/pulsar-edit-mcp-server).

Ti invio:

1) il file PULSAR_MCP_DEV_LOG.md aggiornato
2) lo ZIP completo del repository aggiornato

Ripartiamo dalla FASE A — Audit del repository.

Step corrente:
A.2.i.1 — Rerun reale C1–C10 post short-circuit.

Obiettivo della sessione:
validare in Pulsar reale lo short-circuit post-tool introdotto in A.2.i, verificando che C1–C9 restino positivi e che C10 non fallisca più sulla completion provider di sintesi finale dopo `apply-proposal`. Confermare dalla console che dopo `apply-proposal` viene mostrato un messaggio assistant locale e non parte una seconda chiamata `/v1/chat/completions` non indispensabile. Se C10 resta fragile, distinguere tra rate limit sulla prima completion di decisione tool e rate limit residuo su altri passaggi, valutando solo allora batching semantico apply multipli o cooldown globale più conservativo.

Mantieni sempre il file PULSAR_MCP_DEV_LOG.md completo, aggiornalo
senza comprimere o omettere parti e continua a usare lo schema tabellare:

| ID | Controllo | Esito | Evidenze | Impatto | Azione |

per tutta l'analisi e la revisione.
```

---

# Sessione 34 — A.2.i.1 Hotfix selezione modello chat-compatible

Obiettivo sessione:

* analizzare il rerun reale su Pulsar/Atom dopo reinstallazione del package A.2.i
* distinguere il nuovo errore operativo dal residuo `429` oggetto dello short-circuit post-tool
* correggere la selezione automatica del modello nella chat integrata, evitando che il primo modello della lista `/v1/models` possa essere un modello non compatibile con `/v1/chat/completions`
* mantenere invariati surface MCP, registry tool, workflow proposal/apply e configurazione provider già funzionante
* rimuovere definitivamente dalla snapshot repository il file root vuoto `zztest`
* aggiungere test mirati alla nuova policy di selezione modello

## A.2.i.1 — Hotfix selezione modello chat-compatible

### Evidenze operative ricevute

Durante il test reale post-installazione, i comandi inviati in chat sono stati:

```text
elenca progetti
get-workspace-roots
hello
```

L'errore osservato è stato:

```text
HTTP 404: This is not a chat model and thus not supported in the v1/chat/completions endpoint. Did you mean to use v1/completions?
```

Interpretazione tecnica:

* il package si avvia regolarmente
* i settaggi provider non risultano persi dalla reinstallazione
* il problema non è riconducibile allo short-circuit post-tool A.2.i né al residuo C10 da `429`
* il test non raggiunge ancora `apply-proposal`
* il provider viene contattato su `/v1/chat/completions` con un modello non-chat, verosimilmente perché la select modelli sceglie automaticamente il primo elemento restituito dalla lista provider, ad esempio un embedding model

### Modifiche applicate direttamente al repository

Nuovo modulo introdotto:

* `lib/chat/model-selection.js` → policy dedicata per scegliere un modello chat-compatible dalla lista provider, con preferenza esplicita per `gpt-4o`, poi `gpt-4o-mini`, poi primo modello `gpt-*` non realtime/audio/embedding

Modulo aggiornato:

* `lib/chat-panel.js` → dopo il popolamento della `modelSelect`, applica `applyPreferredModelSelection(modelSelect, models)` invece di lasciare la select sul primo elemento restituito dal provider

Pulizia repository:

* rimosso dalla snapshot il file root vuoto `zztest`, già classificato come artefatto morto/orphan non funzionale

Nuovo test introdotto:

* `test/chat/model-selection.test.js` → copre preferenza `gpt-4o`, fallback `gpt-4o-mini`, esclusione di modelli realtime/audio/embedding e comportamento conservativo quando non esiste un modello chat sicuro

### Boundary architetturale preservato

L'intervento non cambia:

* `lib/chat/config.js`
* API key e lettura configurazione provider
* endpoint `/v1/chat/completions`
* `model-client.js`
* scheduler FIFO
* short-circuit post-tool A.2.i
* tool MCP e contratti proposal/apply
* registry MCP

L'intervento cambia solo la scelta iniziale del valore della dropdown modelli lato chat UI.

### Valutazione A.2.i.1

| ID | Controllo | Esito | Evidenze | Impatto | Azione |
|---|---|---|---|---|---|
| 58 | Errore 404 post reinstallazione classificato correttamente | OK | provider risponde che il modello usato non è supportato da `/v1/chat/completions`; i comandi testati sono base chat/tool e non `apply-proposal` | Alto | separare questo hotfix dalla validazione C10/429 |
| 59 | Config provider non modificata | OK | `lib/chat/config.js` non definisce il modello; endpoint e chiave restano gestiti dai settaggi esistenti | Medio | non intervenire sui default provider già funzionanti |
| 60 | Selezione automatica modello chat-compatible | OK | introdotto `lib/chat/model-selection.js`; preferisce `gpt-4o`, poi `gpt-4o-mini`, poi primo `gpt-*` non realtime/audio/embedding | Alto | validare in Pulsar reale che la dropdown non resti su embedding model |
| 61 | Integrazione UI minimale | OK | `lib/chat-panel.js` applica la selezione preferita dopo il popolamento delle opzioni della select | Medio | mantenere comportamento semplice e non invasivo |
| 62 | Regressione automatica selezione modello | OK | `test/chat/model-selection.test.js` copre preferenze e fallback sicuri | Medio | mantenere come guardrail contro liste provider miste |
| 63 | Rimozione file orphan root `zztest` | OK | file vuoto eliminato dalla snapshot repository | Basso | segnalare come regressione se ricompare nei prossimi ZIP |
| 64 | Compatibilità Pulsar ESM preservata | OK | nuovo modulo `lib/chat/model-selection.js` include pragma `'use babel';`; test pragma mirato passato | Medio | continuare a usare il guardrail sui moduli ESM |

### Verifiche eseguite

Comando mirato eseguito con esito positivo:

```bash
node --test test/chat/model-selection.test.js test/ui/module-babel-pragma.test.js
```

Esito:

* 5 test eseguiti
* 5 test passati
* nessun failure

Tentativo suite aggregata:

```bash
npm run test:unit
```

Esito nell'ambiente container corrente:

* il comando aggregato è stato tentato
* il runner ha fallito perché nello ZIP non sono presenti/installate alcune dipendenze runtime richieste dai test aggregati (`highlight.js`, `diff`, `zod`)
* i failure osservati sono quindi errori ambientali `ERR_MODULE_NOT_FOUND`, non failure logici della modifica applicata
* il test mirato della nuova policy e il guardrail pragma sono stati eseguiti con esito positivo

### Evidenze principali registrate

* il rerun reale ha individuato un blocco precedente rispetto alla validazione A.2.i: la chat chiamava `/v1/chat/completions` con un modello non-chat
* la causa non era la configurazione provider ma la selezione implicita del primo modello nella dropdown
* la fix evita che modelli embedding/audio/realtime vengano scelti automaticamente come default chat
* dopo questo hotfix è necessario rieseguire prima `hello` e `get-workspace-roots`; solo dopo il successo di questi comandi ha senso tornare alla sequenza proposal/apply e al controllo C10

Stato progetto:

```text
FASE A IN CORSO
A.2.i IMPLEMENTATA
A.2.i.1 HOTFIX SELEZIONE MODELLO CHAT-COMPATIBLE APPLICATO
FILE ORPHAN ZZTEST RIMOSSO
TEST MIRATI MODEL-SELECTION + PRAGMA 5/5 PASSATI
PROSSIMO TARGET: RERUN REALE CHAT BASE, POI C1-C10/PROPOSAL-APPLY
```

---

# Prossimo step operativo

Step operativo pronto:

```text
A.2.i.2 — Rerun reale chat base e ripresa validazione C1–C10
```

Focus:

* reinstallare/ricaricare il package aggiornato in Pulsar/Atom
* verificare che la dropdown modelli selezioni `gpt-4o` o `gpt-4o-mini` quando disponibili
* rieseguire `hello` e `get-workspace-roots`
* confermare assenza dell'errore `This is not a chat model`
* solo dopo la chat base funzionante, riprendere la sequenza proposal/apply e la validazione C10 post short-circuit
* controllare in console che, dopo `apply-proposal`, venga mostrato il messaggio assistant locale senza seconda chiamata provider di sintesi finale
