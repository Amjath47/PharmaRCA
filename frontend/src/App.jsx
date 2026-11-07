import { useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import {
  setAnalysis as setAnalysisAction,
  setLoading as setLoadingAction,
  setError as setErrorAction,
  setReviewMessage as setReviewMessageAction,
  setSaving as setSavingAction,
  setSaveMessage as setSaveMessageAction,
  setHasSaved as setHasSavedAction,
} from "./features/rca/rcaSlice";

import "./App.css";
import SavedInvestigations from "./SavedInvestigations.jsx";

const API_URL = "http://127.0.0.1:8000";


function App() {
  const dispatch = useDispatch();

  const {
    analysis,
    loading,
    error,
    reviewMessage,
    saving,
    saveMessage,
    hasSaved,
  } = useSelector((state) => state.rca);

  const [file, setFile] = useState(null);
  const [inputMode, setInputMode] = useState("file");
  const [incidentText, setIncidentText] = useState("");
  const [method, setMethod] = useState("Fishbone");
  const [page, setPage] = useState("upload");

  const setAnalysis = (value) =>
    dispatch(
      setAnalysisAction(
        typeof value === "function" ? value(analysis) : value
      )
    );

  const setLoading = (value) =>
    dispatch(setLoadingAction(value));

  const setError = (value) =>
    dispatch(setErrorAction(value));

  const setReviewMessage = (value) =>
    dispatch(setReviewMessageAction(value));

  const setSaving = (value) =>
    dispatch(setSavingAction(value));

  const setSaveMessage = (value) =>
    dispatch(setSaveMessageAction(value));

  const setHasSaved = (value) =>
    dispatch(setHasSavedAction(value));

  
  async function handleAnalyze(event) {
    event.preventDefault();
  
    if (inputMode === "file" && !file) {
      setError("Please select an investigation document.");
      return;
    }
  
    if (inputMode === "text" && !incidentText.trim()) {
      setError("Please paste the incident information.");
      return;
    }
  
    setLoading(true);
    setError("");
    setAnalysis(null);
    setReviewMessage("");
    setHasSaved(false);
    setSaveMessage("");
  
    try {
      let response;
    
      if (inputMode === "file") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("analysis_method", method);
      
        response = await fetch(`${API_URL}/documents/analyze`, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch(`${API_URL}/documents/analyze-text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            incident_text: incidentText.trim(),
            analysis_method: method,
          }),
        });
      }
    
      const data = await response.json();
    
      if (!response.ok) {
        throw new Error(
          data.detail || "Incident analysis failed."
        );
      }
    
      setAnalysis(data);
    } catch (err) {
      setError(
        err.message ||
          "Cannot connect to the backend. Check that FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }


  function updateAction(type, index, field, value) {
    setAnalysis((current) => {
      const updated = { ...current };
      updated.analysis = { ...current.analysis };

      const actions = [
        ...updated.analysis[type]
      ];

      actions[index] = {
        ...actions[index],
        [field]: value
      };

      updated.analysis[type] = actions;
      return updated;
    });

    setReviewMessage("");
  }

  function updateAnalysisField(field, value) {
  setAnalysis((current) => ({
    ...current,
    analysis: {
      ...current.analysis,
      [field]: value,
    },
  }));

  setReviewMessage("");
  setHasSaved(false);
  setSaveMessage("");
}

function updateListItem(field, index, value) {
  const items = [...(analysis?.analysis?.[field] || [])];
  items[index] = value;
  updateAnalysisField(field, items);
}

function updateRootCause(index, field, value) {
  const causes = [
    ...(analysis?.analysis?.potential_root_causes || []),
  ];

  const current = causes[index];

  causes[index] =
    typeof current === "string"
      ? {
          category: field === "category" ? value : "Uncategorized",
          cause: field === "cause" ? value : current,
        }
      : {
          ...current,
          [field]: value,
        };

  updateAnalysisField("potential_root_causes", causes);
}

async function handleReview() {
  if (hasSaved || saving) {
    return;
  }

  if (!analysis?.analysis) {
    setSaveMessage("Analyze a document first.");
    return;
  }

  setSaving(true);
  setSaveMessage("");

  const result = analysis.analysis;

  async function postRecord(endpoint, payload) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || `Failed to save ${endpoint}`
      );
    }

    return data;
  }

  try {
    const deviation = await postRecord("/deviations", {
      title: `Investigation: ${analysis.filename}`,
      description: analysis.extracted_text,
      department: "Manufacturing",
      severity: "Major"
    });

    if (!deviation.id) {
      throw new Error("Deviation was saved but no ID was returned.");
    }

    const investigation = await postRecord("/investigations", {
      deviation_id: deviation.id,
      analysis_method: analysis.analysis_method,
      problem_statement: result.problem_statement || "",
      why_analysis: JSON.stringify(result.why_analysis || []),
      root_cause: JSON.stringify({
        potential_root_causes: result.potential_root_causes || [],
        fishbone_categories: result.fishbone_categories || [],
        facts: result.facts || [],
        evidence_limitations: result.evidence_limitations || []
      }),
      contributing_factors: JSON.stringify(
        result.contributing_factors || []
      ),
      missing_evidence: JSON.stringify(
        result.missing_evidence || []
      )
    });

    if (!investigation.id) {
      throw new Error(
        "Investigation was saved but no ID was returned."
      );
    }

    for (const item of result.corrective_actions || []) {
      await postRecord("/capas", {
        investigation_id: investigation.id,
        action_type: "Corrective",
        description: item.action,
        justification: item.justification || ""
      });
    }

    for (const item of result.preventive_actions || []) {
      await postRecord("/capas", {
        investigation_id: investigation.id,
        action_type: "Preventive",
        description: item.action,
        justification: item.justification || ""
      });
    }

    setSaveMessage(
      `Saved successfully! Deviation ID: ${deviation.id}, ` +
      `Investigation ID: ${investigation.id}. ` +
      "Review the saved records in MySQL."
    );
    setHasSaved(true);
  } catch (error) {
    setSaveMessage(`Save failed: ${error.message}`);
  } finally {
    setSaving(false);
  }
}


  function downloadReview() {
    if (!analysis) return;

    const content = JSON.stringify(analysis, null, 2);
    const blob = new Blob([content], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "rca-investigation-review.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  const result = analysis?.analysis;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">⚕️</div>
          <div>
            <h1 className="brand-heading">InvestiCare</h1>
            <p>Investigation Workspace</p>
          </div>
        </div>

        <div className="header-status">
          <span className="status-dot"></span>
          Investigation Assistant
        </div>

        <button
          className="secondary-button"
          onClick={() => setPage("saved")}
        >
          Saved Investigations
        </button>
      </header>

      {page === "saved" ? (
        <SavedInvestigations onBack={() => setPage("upload")} />
      ) : (
      <main className="container">
        <section className="welcome">
          <p className="eyebrow">PHARMACEUTICAL QUALITY</p>
          <h2>Root Cause Analysis</h2>
          <p className="welcome-text">
            Analyze manufacturing deviations, identify evidence
            gaps, and prepare corrective and preventive actions
            for investigator review.
          </p>
        </section>

        <section className="upload-card">
          <div className="section-heading">
            <div>
              <h3>New Investigation</h3>
              <p>Upload the incident report to begin.</p>
            </div>
            <span className="step-label">STEP 01</span>
          </div>

          <form onSubmit={handleAnalyze}>
            <label className="field-label">
              Investigation Document
            </label>

            <div className="file-box">
              <div className="input-mode-buttons">
                <button
                  type="button"
                  onClick={() => setInputMode("file")}
                  className={inputMode === "file" ? "active" : ""}
                >
                  Choose file ⬇️
                </button>

                <button
                  type="button"
                  onClick={() => setInputMode("text")}
                  className={inputMode === "text" ? "active" : ""}
                >
                  Paste Text
                </button>
              </div>

              {inputMode === "file" ? (
                <div>
                  <label htmlFor="incident-file">
                    Upload incident document (PDF, TXT, or EML)
                  </label>
                  <input
                    id="incident-file"
                    type="file"
                    accept=".txt,.pdf,.eml"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
              ) : (
                <div>
                  <textarea
                    className="incident-textarea"
                    id="incident-text"
                    rows={8}
                    value={incidentText}
                    onChange={(e) => setIncidentText(e.target.value)}
                    placeholder="Describe the deviation, what happened, when it occurred, and any available evidence..."
                  />
                </div>
              )}


              <p className="file-help">
                Supported formats: PDF, TXT, EML. Maximum 10 MB.
              </p>

              {file && (
                <p className="selected-file">
                  Selected: {file.name}
                </p>
              )}
            </div>

            <label className="field-label" htmlFor="method">
              Analysis Method
            </label>

            <select
              id="method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              <option value="Fishbone">Fishbone Analysis</option>
              <option value="5 Whys">5 Whys Analysis</option>
            </select>

            {error && (
              <div className="error-message">{error}</div>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Analyzing document..."
                : "Analyze Document"}
            </button>
          </form>
        </section>

        {result && (
          <div className="results">
            <div className="results-heading">
              <div>
                <p className="eyebrow">ANALYSIS RESULTS</p>
                <h2>Investigation Review</h2>
                <p className="result-file">
                  Source: {analysis.filename}
                </p>
              </div>

              <span className="review-badge">
                Pending Review
              </span>
            </div>

            <div className="notice">
              AI-generated findings are suggestions, not confirmed
              root causes. A qualified investigator must review
              the evidence and approve any actions.
            </div>

            <section className="result-card">
              <h3>Problem Statement</h3>
              <textarea
                className="analysis-editor"
                value={result.problem_statement || ""}
                onChange={(event) =>
                  updateAnalysisField(
                    "problem_statement",
                    event.target.value
                  )
                }
                placeholder="Review and edit the problem statement"
              />
            </section>

            <section className="result-card">
              <h3>Reported Facts</h3>
              <p className="section-help">
                Review the extracted facts. Keep unverified information
                clearly distinguished from confirmed evidence.
              </p>

              {(result.facts || []).map((fact, index) => (
                <div className="action-editor" key={index}>
                  <label>Fact {index + 1}</label>
                  <textarea
                    className="analysis-editor"
                    value={fact}
                    onChange={(event) => {
                      const facts = [...(result.facts || [])];
                      facts[index] = event.target.value;
                      updateAnalysisField("facts", facts);
                    }}
                  />
                </div>
              ))}

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  updateAnalysisField("facts", [
                    ...(result.facts || []),
                    "",
                  ])
                }
              >
                Add Fact
              </button>
            </section>


            {method === "5 Whys" && (
              <section className="result-card">
                <h3>5 Whys Analysis</h3>
                <p className="section-help">
                  Review and edit each AI-generated step before accepting it.
                </p>
                        
                {(result.why_analysis || []).map((why, index) => (
                  <div className="action-editor" key={index}>
                    <label>Why {index + 1}</label>
                    <textarea
                      className="analysis-editor"
                      value={why}
                      onChange={(event) =>
                        updateListItem(
                          "why_analysis",
                          index,
                          event.target.value
                        )
                      }
                    />
                  </div>
                ))}
            
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    updateAnalysisField("why_analysis", [
                      ...(result.why_analysis || []),
                      "",
                    ])
                  }
                >
                  Add Why Step
                </button>
              </section>
            )}

            {method === "Fishbone" && (
              <section className="result-card">
                <h3>Fishbone Categories</h3>
                        
                <p className="section-help">
                  Review and edit the categories used to investigate possible
                  causes of the deviation.
                </p>
                        
                {(result.fishbone_categories || []).map((category, index) => (
                  <div className="action-editor" key={index}>
                    <label>Category {index + 1}</label>
                    <input
                      className="analysis-editor"
                      value={category}
                      onChange={(event) =>
                        updateListItem(
                          "fishbone_categories",
                          index,
                          event.target.value
                        )
                      }
                    />
                  </div>
                ))}

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    updateAnalysisField("fishbone_categories", [
                      ...(result.fishbone_categories || []),
                      "",
                    ])
                  }
                >
                  Add Category
                </button>
                
                <h4 className="subheading">
                  Potential Root-Cause Hypotheses
                </h4>
                
                <p className="section-help">
                  These are hypotheses, not confirmed root causes. Review them
                  against the available evidence before approval.
                </p>
                
                {(result.potential_root_causes || []).map((item, index) => (
                  <div className="hypothesis action-editor" key={index}>
                    <label>Cause Category {index + 1}</label>
                    <input
                      className="analysis-editor"
                      value={
                        typeof item === "string"
                          ? "Uncategorized"
                          : item.category || ""
                      }
                      onChange={(event) =>
                        updateRootCause(index, "category", event.target.value)
                      }
                    />

                    <label>Potential Cause {index + 1}</label>
                    <textarea
                      className="analysis-editor"
                      value={typeof item === "string" ? item : item.cause || ""}
                      onChange={(event) =>
                        updateRootCause(index, "cause", event.target.value)
                      }
                    />
                  </div>
                ))}

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    updateAnalysisField("potential_root_causes", [
                      ...(result.potential_root_causes || []),
                      { category: "", cause: "" },
                    ])
                  }
                >
                  Add Root-Cause Hypothesis
                </button>
              </section>
            )}

            <section className="result-card">
              <h3>Contributing Factors</h3>
              <p className="section-help">
                Edit the suggested factors or add information supported by evidence.
              </p>
                      
              {(result.contributing_factors || []).map((item, index) => (
                <div className="action-editor" key={index}>
                  <label>Factor {index + 1}</label>
                  <textarea
                    className="analysis-editor"
                    value={item}
                    onChange={(event) =>
                      updateListItem(
                        "contributing_factors",
                        index,
                        event.target.value
                      )
                    }
                  />
                </div>
              ))}
            
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  updateAnalysisField("contributing_factors", [
                    ...(result.contributing_factors || []),
                    "",
                  ])
                }
              >
                Add Factor
              </button>
            </section>

            <section className="result-card">
              <h3>Missing Evidence</h3>
              <p className="section-help">
                Edit the evidence gaps that require further investigation.
              </p>
                          
              {(result.missing_evidence || []).map((item, index) => (
                <div className="action-editor" key={index}>
                  <label>Evidence Gap {index + 1}</label>
                  <textarea
                    className="analysis-editor"
                    value={item}
                    onChange={(event) =>
                      updateListItem(
                        "missing_evidence",
                        index,
                        event.target.value
                      )
                    }
                  />
                </div>
              ))}
            
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  updateAnalysisField("missing_evidence", [
                    ...(result.missing_evidence || []),
                    "",
                  ])
                }
              >
                Add Evidence Gap
              </button>
            </section>

            <section className="result-card">
              <h3>Corrective Actions</h3>
              <p className="section-help">
                Review and edit each proposed action and its reason.
              </p>

              {result.corrective_actions?.length ? (
                result.corrective_actions.map((item, index) => (
                  <div className="action-editor" key={index}>
                    <label>Action {index + 1}</label>
                    <textarea
                      value={item.action}
                      onChange={(event) =>
                        updateAction(
                          "corrective_actions",
                          index,
                          "action",
                          event.target.value
                        )
                      }
                    />

                    <label>Justification</label>
                    <textarea
                      value={item.justification || ""}
                      onChange={(event) =>
                        updateAction(
                          "corrective_actions",
                          index,
                          "justification",
                          event.target.value
                        )
                      }
                    />
                  </div>
                ))
              ) : (
                <p>No corrective actions returned.</p>
              )}
            </section>

            <section className="result-card">
              <h3>Preventive Actions</h3>
              <p className="section-help">
                Review and edit the proposals before approval.
              </p>

              {result.preventive_actions?.length ? (
                result.preventive_actions.map((item, index) => (
                  <div className="action-editor" key={index}>
                    <label>Action {index + 1}</label>
                    <textarea
                      value={item.action}
                      onChange={(event) =>
                        updateAction(
                          "preventive_actions",
                          index,
                          "action",
                          event.target.value
                        )
                      }
                    />

                    <label>Justification</label>
                    <textarea
                      value={item.justification || ""}
                      onChange={(event) =>
                        updateAction(
                          "preventive_actions",
                          index,
                          "justification",
                          event.target.value
                        )
                      }
                    />
                  </div>
                ))
              ) : (
                <p>No preventive actions returned.</p>
              )}
            </section>

            <section className="result-card">
              <h3>Evidence Limitations</h3>
              <p className="section-help">
                Review limitations in the available incident information.
              </p>

              {(result.evidence_limitations || []).map((item, index) => (
                <div className="action-editor" key={index}>
                  <label>Limitation {index + 1}</label>
                  <textarea
                    className="analysis-editor"
                    value={item}
                    onChange={(event) =>
                      updateListItem(
                        "evidence_limitations",
                        index,
                        event.target.value
                      )
                    }
                  />
                </div>
              ))}

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  updateAnalysisField("evidence_limitations", [
                    ...(result.evidence_limitations || []),
                    "",
                  ])
                }
              >
                Add Limitation
              </button>
            </section>

            <div className="review-actions">
              <button
                className="primary-button"
                onClick={handleReview}
                disabled={saving || hasSaved}
              >
                {saving
                  ? "Saving records..."
                  : hasSaved
                    ? "Investigation Saved"
                    : "Save Investigation"}
              </button>

              {saveMessage && (
                <div className="success-message">
                  {saveMessage}
                </div>
              )}

              <button
                className="secondary-button"
                onClick={downloadReview}
              >
                Download Review JSON
              </button>
            </div>
          </div>
        )}
        </main>
      )}  

      <footer className="footer">
        RCA/CAPA Investigation Workspace
        <span>AI-assisted · Human-reviewed</span>
      </footer>
    </div>
  );
}

export default App;