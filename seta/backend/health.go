/* ==========================================================================
   seta — liveness and readiness
   Two different questions, and the UI only cares about the second one: "is the
   process up?" never blocks, "is the model ready to translate?" flips from 503
   to 200 once the weights are loaded and warm. Both are answered from memory
   now — there is no model server to probe.
   ========================================================================== */

package main

import "net/http"

// healthHandler is liveness only — the process is up and serving. It must not
// touch the model, or a warming engine would mark the app itself dead.
func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// readyHandler is readiness — has the model finished loading? The UI polls it to
// show "engine warming up" instead of failing translation after translation
// while the weights are still paging in. The library and HSK tabs work either
// way, so a missing model is a 503 here, not a dead app.
func (a *app) readyHandler(w http.ResponseWriter, r *http.Request) {
	if !a.engine.Ready() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "warming up"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}
