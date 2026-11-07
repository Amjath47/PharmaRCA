import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function getRecords(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function parseSavedData(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function DisplayList({ value, emptyMessage }) {
  const items = parseSavedData(value);

  if (!items || (Array.isArray(items) && items.length === 0)) {
    return <p>{emptyMessage}</p>;
  }

  if (!Array.isArray(items)) {
    return <p>{String(items)}</p>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>
          {typeof item === "object" && item !== null
            ? item.cause || item.action || JSON.stringify(item)
            : item}
        </li>
      ))}
    </ul>
  );
}

function SavedInvestigations({ onBack }) {
  const [deviations, setDeviations] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [capas, setCapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  async function loadRecords() {
    setLoading(true);
    setError("");

    try {
      const responses = await Promise.all([
        fetch(`${API_URL}/deviations`),
        fetch(`${API_URL}/investigations`),
        fetch(`${API_URL}/capas`)
      ]);

      for (const response of responses) {
        if (!response.ok) {
          throw new Error("Failed to load saved records.");
        }
      }

      const [deviationData, investigationData, capaData] =
        await Promise.all(responses.map((response) => response.json()));

      setDeviations(getRecords(deviationData, "deviations"));
      setInvestigations(getRecords(investigationData, "investigations"));
      setCapas(getRecords(capaData, "capas"));
    } catch (err) {
      setError(err.message || "Could not load saved investigations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  function getInvestigationCapas(investigationId) {
    return capas.filter(
      (capa) => capa.investigation_id === investigationId
    );
  }

  return (
    <div className="saved-page">
      <div className="saved-heading">
        <div>
          <p className="eyebrow">INVESTIGATION HISTORY</p>
          <h2>Saved Investigations</h2>
          <p className="welcome-text">
            View deviations, investigation records and CAPA actions
            saved in your database.
          </p>
        </div>

        <button className="secondary-button" onClick={onBack}>
          Back to Analysis
        </button>
      </div>

      <button
        className="primary-button refresh-button"
        onClick={loadRecords}
        disabled={loading}
      >
        {loading ? "Loading..." : "Refresh Records"}
      </button>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="result-card">Loading saved records...</div>
      ) : investigations.length === 0 ? (
        <div className="result-card">
          No saved investigations found.
        </div>
      ) : (
        investigations.map((investigation) => {
          const deviation = deviations.find(
            (item) => item.id === investigation.deviation_id
          );

          const investigationCapas = getInvestigationCapas(
            investigation.id
          );

          const expanded = selectedId === investigation.id;
          const savedRootCause = parseSavedData(investigation.root_cause);
          const whyAnalysis = parseSavedData(investigation.why_analysis);
          const categories = savedRootCause?.fishbone_categories || [];
          const facts = savedRootCause?.facts || [];
          const causes = savedRootCause?.potential_root_causes || [];
          const limitations = savedRootCause?.evidence_limitations || [];

          return (
            <section className="result-card saved-record" key={investigation.id}>
              <div className="saved-record-heading">
                <div>
                  <h3>
                    {deviation?.title ||
                      `Investigation #${investigation.id}`}
                  </h3>
                  <p>
                    Deviation ID: {investigation.deviation_id}
                    {" · "}
                    Investigation ID: {investigation.id}
                  </p>
                </div>

                <span className="review-badge">
                  {investigation.status || "Saved"}
                </span>
              </div>

              <div className="saved-info-grid">
                <div>
                  <span>Analysis Method</span>
                  <strong>
                    {investigation.analysis_method || "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>Department</span>
                  <strong>{deviation?.department || "Not specified"}</strong>
                </div>

                <div>
                  <span>Severity</span>
                  <strong>{deviation?.severity || "Not specified"}</strong>
                </div>

                <div>
                  <span>CAPA Actions</span>
                  <strong>{investigationCapas.length}</strong>
                </div>
              </div>

              <p>
                <strong>Problem:</strong>{" "}
                {investigation.problem_statement || "Not recorded"}
              </p>

              <button
                className="secondary-button"
                onClick={() =>
                  setSelectedId(expanded ? null : investigation.id)
                }
              >
                {expanded ? "Hide Details" : "View Details"}
              </button>

              {expanded && (
                <div className="saved-details">
                  {investigation.analysis_method === "5 Whys" && (
                    <>
                      <h4>5 Whys Analysis</h4>
                      <DisplayList
                        value={whyAnalysis}
                        emptyMessage="No 5 Whys steps were saved for this investigation."
                      />
                    </>
                  )}

                  {investigation.analysis_method === "Fishbone" && (
                    <>
                      <h4>Fishbone Categories</h4>
                      <div className="category-grid">
                        {Array.isArray(categories) && categories.length > 0 ? (
                          categories.map((category, index) => (
                            <span className="category-chip" key={index}>
                              {category}
                            </span>
                          ))
                        ) : (
                          <p>No Fishbone categories recorded.</p>
                        )}
                      </div>
                    </>
                  )}

                  <h4>Reported Facts</h4>
                  <DisplayList
                    value={facts}
                    emptyMessage="No facts recorded."
                  />

                  <h4>Potential Root-Cause Hypotheses</h4>
                  {Array.isArray(causes) && causes.length > 0 ? (
                    causes.map((item, index) => (
                      <div className="hypothesis" key={index}>
                        {item?.category && (
                          <span className="hypothesis-category">
                            {item.category}
                          </span>
                        )}
                        <p>
                          {typeof item === "string"
                            ? item
                            : item?.cause || "No description available."}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p>No root-cause hypotheses recorded.</p>
                  )}

                  <p className="section-help">
                    These are AI-generated hypotheses, not confirmed root causes.
                    A qualified investigator must review the evidence.
                  </p>

                  <h4>Contributing Factors</h4>
                  <DisplayList
                    value={investigation.contributing_factors}
                    emptyMessage="No contributing factors identified."
                  />

                  <h4>Missing Evidence</h4>
                  <DisplayList
                    value={investigation.missing_evidence}
                    emptyMessage="No missing evidence recorded."
                  />

                  <h4>Evidence Limitations</h4>
                  <DisplayList
                    value={limitations}
                    emptyMessage="No evidence limitations recorded."
                  />

                  <h4>CAPA Actions</h4>
                  {investigationCapas.length === 0 ? (
                    <p>No CAPA actions found for this investigation.</p>
                  ) : (
                    investigationCapas.map((capa) => (
                      <div className="saved-capa" key={capa.id}>
                        <span className="category-chip">
                          {capa.action_type}
                        </span>
                        <p>{capa.description}</p>
                        <p>
                          <strong>Justification:</strong>{" "}
                          {capa.justification || "Not provided"}
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          {capa.status || "Not specified"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          );
        })
      )}

      <p className="saved-count">
        Total investigations: {investigations.length}
      </p>
    </div>
  );
}

export default SavedInvestigations;