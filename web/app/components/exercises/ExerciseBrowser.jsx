"use client";
import React, { useState, useEffect } from "react";
import {
  TextField,
  Pagination,
  InputAdornment,
  Typography,
} from "@mui/material";
import { Search, X } from "lucide-react";
import apiClient from "@/lib/apiClient";
import ExerciseCard from "@/app/components/homeComponents/Exercise/ExerciseCard";
import AddExercise from "@/app/AddExercise/AddExercise";

const PAGE_SIZE = 12;

const ExerciseBrowser = () => {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [bodyPart, setBodyPart] = useState("all");
  const [page, setPage] = useState(1);

  const [bodyParts, setBodyParts] = useState([]);
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addExer, setAddExer] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/api/exercisedb/bodyPart")
      .then((res) => {
        if (!cancelled) {
          setBodyParts(["all", ...(Array.isArray(res.data) ? res.data : [])]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced so typing doesn't fire a query per keystroke. Page resets here
  // rather than in its own effect — a separate effect would let one stale
  // request go out on the old page before the reset landed.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    apiClient
      .get("/api/exercisedb/browse", {
        params: {
          search: search || undefined,
          bodyPart: bodyPart === "all" ? undefined : bodyPart,
          page,
          limit: PAGE_SIZE,
        },
      })
      .then((res) => {
        if (cancelled) return;
        setResult({
          items: res.data?.items || [],
          total: res.data?.total || 0,
          pages: res.data?.pages || 1,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Browse failed:", err);
        setError("Couldn't load exercises. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Guards against out-of-order responses: a slow "all" request resolving
    // after a fast "chest" one would otherwise overwrite the newer results.
    return () => {
      cancelled = true;
    };
  }, [search, bodyPart, page]);

  const selectBodyPart = (value) => {
    setBodyPart(value);
    setPage(1);
  };

  const changePage = (_, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-xl">
        <TextField
          fullWidth
          size="medium"
          placeholder="Search by name, muscle or equipment"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
            endAdornment: input ? (
              <InputAdornment position="end">
                <button onClick={() => setInput("")} aria-label="Clear search">
                  <X size={16} />
                </button>
              </InputAdornment>
            ) : null,
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {bodyParts.map((item) => {
          const active = bodyPart === item;
          return (
            <button
              key={item}
              onClick={() => selectBodyPart(item)}
              className={`px-3.5 py-1.5 rounded-full text-sm capitalize border transition-colors ${
                active ? "" : "border-border hover:bg-muted"
              }`}
              style={
                active
                  ? {
                      backgroundColor: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                      borderColor: "hsl(var(--primary))",
                    }
                  : undefined
              }
            >
              {item}
            </button>
          );
        })}
      </div>

      <Typography variant="body2" color="text.secondary">
        {loading
          ? "Loading…"
          : `${result.total} exercise${result.total === 1 ? "" : "s"}`}
        {search && !loading ? ` matching "${search}"` : ""}
      </Typography>

      {error && <Typography color="error">{error}</Typography>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card animate-pulse h-[320px]"
            />
          ))}
        </div>
      ) : result.items.length === 0 ? (
        <div className="border border-border rounded-xl p-10 text-center">
          <Typography variant="body1">No exercises match that.</Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1">
            Try a different muscle group, or clear the search.
          </Typography>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {result.items.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              setAddExer={setAddExer}
            />
          ))}
        </div>
      )}

      {result.pages > 1 && !loading && (
        <div className="flex justify-center pt-2">
          <Pagination
            count={result.pages}
            page={page}
            onChange={changePage}
            shape="rounded"
            color="primary"
          />
        </div>
      )}

      {addExer && (
        <AddExercise exerc={addExer} setShowPopup={() => setAddExer(null)} />
      )}
    </div>
  );
};

export default ExerciseBrowser;
