/* Integración React 18 y consumo de API externa para Almacenes Mega Oferta */
(function () {
  const EXTERNAL_API_URL = "https://open.er-api.com/v6/latest/USD";

  async function fetchExternalMarketData() {
    try {
      const response = await fetch(EXTERNAL_API_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("Respuesta HTTP no válida");
      const data = await response.json();
      const rates = data && data.rates ? data.rates : {};
      const payload = {
        base: "USD",
        date: data.time_last_update_utc || new Date().toUTCString(),
        eur: typeof rates.EUR === "number" ? rates.EUR : 0.92,
        mxn: typeof rates.MXN === "number" ? rates.MXN : 18.4,
        gtq: typeof rates.GTQ === "number" ? rates.GTQ : 7.75,
        source: "ExchangeRate API (open.er-api.com)",
        live: true
      };
      localStorage.setItem("mega_oferta_external_api", JSON.stringify(payload));
      return payload;
    } catch (_) {
      const cached = localStorage.getItem("mega_oferta_external_api");
      if (cached) {
        try {
          return { ...JSON.parse(cached), live: false };
        } catch (__) {}
      }
      return {
        base: "USD",
        date: "Referencia local activa",
        eur: 0.92,
        mxn: 18.4,
        gtq: 7.75,
        source: "Respaldo integrado (API externa)",
        live: false
      };
    }
  }

  function mountReactIntegration() {
    if (!window.React || !window.ReactDOM) return;
    const e = window.React.createElement;
    const { useState, useEffect } = window.React;

    const target = document.getElementById("reactApiBar");
    if (!target) return;

    function ExternalApiBanner() {
      const [market, setMarket] = useState({
        base: "USD",
        date: "Consultando API externa...",
        eur: 0.92,
        mxn: 18.4,
        gtq: 7.75,
        source: "open.er-api.com",
        live: false
      });
      const [currency, setCurrency] = useState(
        localStorage.getItem("mega_oferta_display_currency") || "USD"
      );

      useEffect(() => {
        let active = true;
        fetchExternalMarketData().then((res) => {
          if (active) setMarket(res);
        });
        return () => {
          active = false;
        };
      }, []);

      const handleCurrencyChange = (nextCurrency) => {
        setCurrency(nextCurrency);
        localStorage.setItem("mega_oferta_display_currency", nextCurrency);
        window.dispatchEvent(
          new CustomEvent("megaOfertaCurrencyChange", {
            detail: { currency: nextCurrency, rates: market }
          })
        );
      };

      const rateLabel =
        currency === "EUR"
          ? `1 USD = ${market.eur.toFixed(4)} EUR`
          : currency === "MXN"
          ? `1 USD = ${market.mxn.toFixed(2)} MXN`
          : currency === "GTQ"
          ? `1 USD = ${market.gtq.toFixed(2)} GTQ`
          : `1 USD = $1.00 USD (Base)`;

      return e(
        "div",
        {
          className: "card-soft p-3 mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3",
          style: { borderLeft: "4px solid #5d3fd3" }
        },
        [
          e("div", { key: "info" }, [
            e(
              "span",
              { className: "badge text-bg-primary me-2" },
              "React 18 + API Externa"
            ),
            e(
              "strong",
              { style: { fontSize: "0.95rem" } },
              `Referencia cambiaria: ${rateLabel}`
            ),
            e(
              "div",
              { className: "small text-secondary mt-1" },
              `Fuente: ${market.source} · ${market.live ? "En línea" : "Modo respaldo"}`
            )
          ]),
          e("div", { key: "controls", className: "d-flex align-items-center gap-2 flex-wrap" }, [
            e("span", { className: "small text-secondary" }, "Moneda de referencia:"),
            ...["USD", "EUR", "MXN", "GTQ"].map((code) =>
              e(
                "button",
                {
                  key: code,
                  type: "button",
                  className: `btn btn-sm ${
                    currency === code ? "btn-primary" : "btn-outline-secondary"
                  }`,
                  onClick: () => handleCurrencyChange(code)
                },
                code
              )
            )
          ])
        ]
      );
    }

    if (typeof window.ReactDOM.createRoot === "function") {
      window.ReactDOM.createRoot(target).render(e(ExternalApiBanner));
    } else if (typeof window.ReactDOM.render === "function") {
      window.ReactDOM.render(e(ExternalApiBanner), target);
    }
  }

  window.getExternalCurrencyMultiplier = function () {
    const code = localStorage.getItem("mega_oferta_display_currency") || "USD";
    let rates = { eur: 0.92, mxn: 18.4, gtq: 7.75 };
    try {
      const saved = JSON.parse(localStorage.getItem("mega_oferta_external_api") || "{}");
      rates = { ...rates, ...saved };
    } catch (_) {}
    if (code === "EUR") return { code, factor: Number(rates.eur) || 0.92, symbol: "€" };
    if (code === "MXN") return { code, factor: Number(rates.mxn) || 18.4, symbol: "MX$" };
    if (code === "GTQ") return { code, factor: Number(rates.gtq) || 7.75, symbol: "Q" };
    return { code: "USD", factor: 1, symbol: "$" };
  };

  document.addEventListener("DOMContentLoaded", () => {
    mountReactIntegration();
    window.addEventListener("megaOfertaCurrencyChange", () => {
      if (typeof window.renderCatalog === "function") window.renderCatalog();
      if (typeof window.renderCart === "function") window.renderCart();
    });
  });
})();
