import { useEffect, useRef, useState } from "react";
import { IconSearch } from "./Icons.jsx";

const PUB = "https://pubchem.ncbi.nlm.nih.gov/rest";

export default function ChemicalAutocomplete({ onPick, placeholder }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setHint("");
      return;
    }
    setLoading(true);
    setHint("");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${PUB}/autocomplete/compound/${encodeURIComponent(q)}/json?limit=6`
        );
        const data = await res.json();
        const list = data?.dictionary_terms?.compound || [];
        setSuggestions(list);
        setOpen(true);
        if (res.ok === false || !list.length) setHint("No matches on PubChem");
      } catch {
        setSuggestions([]);
        setHint("PubChem unreachable — type details manually");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const pick = async (name) => {
    setOpen(false);
    setBusy(true);
    setHint("Loading details…");
    try {
      const cidRes = await fetch(
        `${PUB}/compound/name/${encodeURIComponent(name)}/cids/JSON`
      );
      const cidData = await cidRes.json();
      const cid = cidData?.IdentifierList?.CID?.[0];
      if (!cid) throw new Error("no cid");

      const [propRes, synRes] = await Promise.all([
        fetch(
          `${PUB}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName/JSON`
        ),
        fetch(`${PUB}/compound/cid/${cid}/synonyms/JSON`),
      ]);
      const p = (await propRes.json())?.PropertyTable?.Properties?.[0];
      const synonyms =
        (await synRes.json())?.InformationList?.Information?.[0]?.Synonym || [];
      const cas = synonyms.find((s) => /^\d{2,7}-\d{2}-\d$/.test(s));

      onPick({
        name,
        formula: p?.MolecularFormula || "",
        cas: cas || "",
        extra: p?.IUPACName && p.IUPACName !== name ? p.IUPACName : "",
        weight: p?.MolecularWeight ? `MW ${p.MolecularWeight}` : "",
      });
      setQuery("");
      setHint("Auto-filled from PubChem");
    } catch {
      onPick({ name });
      setHint("Auto-filled name only (PubChem details unavailable)");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="autocomplete" ref={boxRef}>
      <div className="autocomplete-input">
        <span className="search-icon">
          <IconSearch size={15} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          placeholder={placeholder}
          disabled={busy}
        />
        {loading && <span className="ac-spinner">…</span>}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="ac-list">
          {suggestions.map((s, i) => (
            <li key={`${s}-${i}`}>
              <button type="button" onClick={() => pick(s)}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hint && query !== "" && (
        <div className="ac-hint">{hint}</div>
      )}
    </div>
  );
}