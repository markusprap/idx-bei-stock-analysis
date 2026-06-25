# Sahamigo — Lean Canvas

ALAN Layer 1 (Business Foundation) artifact. Captures *why* and *for whom*, ahead of any constitution/sprint work.

## Problem
Investor pemula IDX tidak punya cara belajar membaca data fundamental sendiri — semua app existing (Stockbit, FITStock, Invezgo, Pluang Aura AI) langsung memberi sinyal beli/jual, bukan mengajarkan cara membaca data.

## Customer Segments
Investor ritel Indonesia, mayoritas usia di bawah 30 (KSEI: 22,97M investor Feb 2026, 54,69% di bawah 30). MVP: Markus sendiri dulu (n=1), publik freemium menyusul.

## Unique Value Proposition
"Teman belajar baca saham, bukan ikut sinyal" — AI chat yang menyajikan data EOD lengkap dari scraper sendiri, tapi tidak pernah menyimpulkan buy/sell/hold — selalu melempar balik jadi pertanyaan agar user belajar membaca data sendiri.

## Solution
Chat AI (OpenRouter, default Sonnet 4.6) + Search/IHSG + Stock Detail + Watchlist, seluruh data dari Postgres + Neo4j hasil scraper sendiri.

## Unfair Advantage
1. Scraper/data pipeline sendiri — tidak bergantung pada API pihak ketiga.
2. Positioning "tanpa sinyal" adalah white space regulasi (OJK) yang kompetitor tidak bisa/tidak mau masuk.
3. Founder adalah target user sendiri (insight otentik, bukan riset jarak jauh).

## Revenue Streams
Freemium: Free (30 chat/bulan, 3 watchlist) → Pro (300 chat/bulan, 25 watchlist, data lebih dalam), harga kerja Rp49k–99k/bulan. Pro tetap hard-capped, bukan unlimited.

## Cost Structure
LLM token (OpenRouter Sonnet/Haiku), VPS Hetzner CX32, maintenance scraper.

## Key Metrics
Fase personal (T0): usage organik 3-4 minggu beruntun, ≥1 insight konkret/minggu, nol pelanggaran golden-rule.

## Channels
**Pending** — diputuskan sebelum mulai T1 (beta tertutup). Prioritas saat ini adalah menyelesaikan T0 (MVP personal) terlebih dahulu.
