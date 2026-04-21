import pandas as pd
import json
import re
import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env

# Neo4j connection config
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

def clean_indonesian_name(name):
    """
    Cleans a name string by removing common Indonesian titles, degrees, and honorifics.
    Note: The original notebook function was returning the uncleaned name. This version 
    includes the cleaning logic but is currently set to return the original name 
    to match the notebook's final behavior, or it can be uncommented to clean the name.
    """
    original_name = name
    # Define known titles, degrees, and honorifics (add more as needed)
    noise_tokens = {
        'dr', 'drs', 'h', 'ir', 'prof', 'kh', 'hj', 'hrh', 'mr', 'mrs', 'ms',  # prefixes
        'sh', 'mh', 'phd', 'spd', 'mpd', 'se', 'mm', 'msi', 'skom', 'st', 'mt', 'mkom', 'pm', 'bsc'  # suffixes
    }

    name_lower = name.lower()
    name_lower = re.sub(r'[^\w\s]', '', name_lower)  # remove punctuation
    tokens = name_lower.split()
    
    # Remove known titles and single-letter fragments (initials)
    tokens = [t for t in tokens if t not in noise_tokens and len(t) > 1]
    
    return original_name
    # return ' '.join(tokens).title()


def delete_all_data():
    """Deletes all nodes and relationships from the Neo4j database."""
    cypher_query = "MATCH (n) DETACH DELETE n"
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        session.run(cypher_query)
    driver.close()
    print("All data deleted.")


def ingest_stock_profiles(tx, stock):
    """Ingests a single stock's profile, directors, commissioners, etc. to Neo4j."""
    # Ensure all list lookups are safe
    try:
        profile = stock['Profiles'][0]
    except IndexError:
        print(f"Skipping stock due to missing profile data: {stock}")
        return
        
    kode = profile["KodeEmiten"]

    # Create/Update Company node with enriched data
    tx.run("""
        MERGE (c:Company {kode: $kode})
        SET c.name = $kode,
            c.companyName = $name,
            c.industry = $industry,
            c.subIndustry = $sub_industry,
            c.sector = $sector,
            c.subSector = $sub_sector,
            c.website = $website,
            c.email = $email,
            c.phone = $telepon,
            c.fax = $fax,
            c.address = $alamat,
            c.npwp = $npwp,
            c.listingBoard = $papan,
            c.listingDate = date($tanggal_pencatatan),
            c.businessActivity = $kegiatan_usaha
    """, kode=kode,
         name=profile.get("NamaEmiten"),
         industry=profile.get("Industri"),
         sub_industry=profile.get("SubIndustri"),
         sector=profile.get("Sektor"),
         sub_sector=profile.get("SubSektor"),
         website=profile.get("Website"),
         email=profile.get("Email"),
         telepon=profile.get("Telepon"),
         fax=profile.get("Fax"),
         alamat=profile.get("Alamat"),
         npwp=profile.get("NPWP"),
         papan=profile.get("PapanPencatatan"),
         tanggal_pencatatan=profile.get("TanggalPencatatan", "")[:10],
         kegiatan_usaha=profile.get("KegiatanUsahaUtama")
    )

    # Directors
    directors = [
        {
            "name": clean_indonesian_name(d.get("Nama", "")),
            "jabatan": d.get("Jabatan"),
            "afiliasi": d.get("Afiliasi", False)
        }
        for d in stock.get("Direktur", [])
    ]
    if directors:
        tx.run("""
            MATCH (c:Company {kode: $kode})
            WITH c
            UNWIND $directors AS d
            MERGE (di:Insider {name: d.name})
            MERGE (di)-[:DIRECTOR_OF {jabatan: d.jabatan, afiliasi: d.afiliasi}]->(c)
        """, directors=directors, kode=kode)

    # Commissioners
    commissioners = [
        {
            "name": clean_indonesian_name(k.get("Nama", "")),
            "jabatan": k.get("Jabatan"),
            "independen": k.get("Independen", False)
        }
        for k in stock.get("Komisaris", [])
    ]
    if commissioners:
        tx.run("""
            MATCH (c:Company {kode: $kode})
            WITH c
            UNWIND $commissioners AS k
            MERGE (ki:Insider {name: k.name})
            MERGE (ki)-[:COMMISSIONER_OF {jabatan: k.jabatan, independen: k.independen}]->(c)
        """, commissioners=commissioners, kode=kode)

    # Corporate Secretary
    secretaries = [
        {
            "name": clean_indonesian_name(s.get("Nama", "")),
            "phone": s.get("Telepon"),
            "email": s.get("Email"),
            "fax": s.get("Fax")
        }
        for s in stock.get("Sekretaris", [])
    ]
    if secretaries:
        tx.run("""
            MATCH (c:Company {kode: $kode})
            WITH c
            UNWIND $secretaries AS s
            MERGE (sec:Insider {name: s.name})
            MERGE (sec)-[:CORPORATE_SECRETARY_OF {
                phone: s.phone, email: s.email, fax: s.fax
            }]->(c)
        """, secretaries=secretaries, kode=kode)

    # Audit Committee
    audit_committee = [
        {
            "name": clean_indonesian_name(a.get("Nama", "")),
            "jabatan": a.get("Jabatan")
        }
        for a in stock.get("KomiteAudit", [])
    ]
    if audit_committee:
        tx.run("""
            MATCH (c:Company {kode: $kode})
            WITH c
            UNWIND $audit_committee AS a
            MERGE (ac:Insider {name: a.name})
            MERGE (ac)-[:AUDIT_COMMITTEE_MEMBER_OF {jabatan: a.jabatan}]->(c)
        """, audit_committee=audit_committee, kode=kode)

    # Shareholders
    shareholders = [
        {
            "name": clean_indonesian_name(s.get("Nama", "")),
            "jumlah": s.get("Jumlah"),
            "kategori": s.get("Kategori"),
            "pengendali": s.get("Pengendali"),
            "persentase": s.get("Persentase")
        }
        for s in stock.get("PemegangSaham", [])
    ]
    if shareholders:
        tx.run("""
            MATCH (c:Company {kode: $kode})
            WITH c
            UNWIND $shareholders AS s
            MERGE (sh:Insider {name: s.name})
            MERGE (sh)-[:OWNS {jumlah: s.jumlah, kategori: s.kategori, pengendali: s.pengendali, persentase: s.persentase}]->(c)
        """, shareholders=shareholders, kode=kode)

    # Subsidiaries (AnakPerusahaan)
    subsidiaries = [
        {
            "name": a.get("Nama", ""),
            "bidang_usaha": a.get("BidangUsaha"),
            "lokasi": a.get("Lokasi"),
            "jumlah_aset": a.get("JumlahAset"),
            "satuan": a.get("Satuan"),
            "status_operasi": a.get("StatusOperasi"),
            "tahun_komersil": a.get("TahunKomersil"),
            "mata_uang": a.get("MataUang"),
            "persentase": a.get("Persentase")
        }
        for a in stock.get("AnakPerusahaan", [])
    ]
    if subsidiaries:
        tx.run("""
            MATCH (c:Company {kode: $kode})
            WITH c
            UNWIND $subsidiaries AS sub
            MERGE (s:Subsidiary {name: sub.name})
            SET s.bidangUsaha = sub.bidang_usaha, s.lokasi = sub.lokasi, s.jumlahAset = sub.jumlah_aset,
                s.satuan = sub.satuan, s.statusOperasi = sub.status_operasi, s.tahunKomersil = sub.tahun_komersil,
                s.mataUang = sub.mata_uang
            MERGE (s)-[:SUBSIDIARY_OF {persentase: sub.persentase}]->(c)
        """, subsidiaries=subsidiaries, kode=kode)


def ingest_all_stock_profiles(data_path="../data/companyDetailsByKodeEmiten.json"):
    """Loads stock profiles from JSON and ingests them into Neo4j."""
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            stocks_profile = json.load(f)
    except FileNotFoundError:
        print(f"Error: Data file not found at {data_path}")
        return

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        for ticker, stock_data in stocks_profile.items():
            session.execute_write(ingest_stock_profiles, stock_data) 

    print("Stock profile ingestion complete.")
    driver.close()

# Cypher for TradeDay ingestion
CYPHER_TRADE_QUERY = """
UNWIND $batch AS row
MERGE (c:Company {kode: row.StockCode})
MERGE (s:TradeDay {
    date: date(split(row.Date, "T")[0]),
    kode: row.StockCode
})
SET 
    s.name = toString(date(split(row.Date, "T")[0])) + "|" + row.StockCode,
    s.idstocksummary=row.IDStockSummary,
    s.stockname=row.StockName,
    s.remarks=row.Remarks,
    s.previous=row.Previous,
    s.openprice=row.OpenPrice,
    s.firsttrade=row.FirstTrade,
    s.high=row.High,
    s.low=row.Low,
    s.close=row.Close,
    s.change=row.Change,
    s.volume=row.Volume,
    s.value=row.Value,
    s.frequency=row.Frequency,
    s.indexindividual=row.IndexIndividual,
    s.offer=row.Offer,
    s.offervolume=row.OfferVolume,
    s.bid=row.Bid,
    s.bidvolume=row.BidVolume,
    s.listedshares=row.ListedShares,
    s.tradebleshares=row.Tradebleshares,
    s.weightforindex=row.WeightForIndex,
    s.foreignsell=row.ForeignSell,
    s.foreignbuy=row.ForeignBuy,
    s.delistingdate=row.DelistingDate,
    s.nonregularvolume=row.NonRegularVolume,
    s.nonregularvalue=row.NonRegularValue,
    s.nonregularfrequency=row.NonRegularFrequency
MERGE (c)-[:HAS_TRADE_DAY]->(s)
"""

def insert_trade_data(uri, user, password, data):
    """Inserts a batch of stock summary data (TradeDay nodes) into Neo4j."""
    driver = GraphDatabase.driver(uri, auth=(user, password))
    with driver.session() as session:
        session.execute_write(lambda tx: tx.run(CYPHER_TRADE_QUERY, batch=data))
    driver.close()

def ingest_all_stock_summaries(data_path="../data/companySummaryByKodeEmiten.json"):
    """Loads stock summaries from JSON and ingests them into Neo4j."""
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            stocks_summary = json.load(f)['data']
    except FileNotFoundError:
        print(f"Error: Data file not found at {data_path}")
        return
    except KeyError:
        print(f"Error: 'data' key not found in {data_path}. Check JSON structure.")
        return

    insert_trade_data(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, stocks_summary)
    print("Stock summary data ingested successfully.")


if __name__ == "__main__":
    # Example usage:
    delete_all_data()
    ingest_all_stock_profiles()
    # ingest_all_stock_summaries()
    pass
