"""Derive daily-5y.csv from the DSTA MTS fixings file (stdlib only).

Usage: python3 -I derive.py mts-fixings-publicatie.ods daily-5y.csv [first-date]

Download the ODS from https://english.dsta.nl/latest/statistical-information/yields-on-dsls
("Yields on DSLs from 2010 onwards"). Method: docs/research/projection-data.md §1.2.
"""
import datetime as dt
import sys
import xml.etree.ElementTree as ET
import zipfile

T = '{urn:oasis:names:tc:opendocument:xmlns:table:1.0}'
X = '{urn:oasis:names:tc:opendocument:xmlns:text:1.0}'
O = '{urn:oasis:names:tc:opendocument:xmlns:office:1.0}'


def rows(path):
    """Yields (sheet name, [cell values]) for every non-empty row."""
    sheet = None
    with zipfile.ZipFile(path) as z:
        for ev, el in ET.iterparse(z.open('content.xml'), events=('start', 'end')):
            if ev == 'start' and el.tag == T + 'table':
                sheet = el.get(T + 'name')
            if ev == 'end' and el.tag == T + 'table-row':
                cells = []
                for c in el:
                    if c.tag not in (T + 'table-cell', T + 'covered-table-cell'):
                        continue
                    rep = int(c.get(T + 'number-columns-repeated', '1'))
                    v = c.get(O + 'value') or c.get(O + 'date-value')
                    if v is None:
                        v = ''.join(''.join(p.itertext()) for p in c.findall(X + 'p'))
                    cells.extend([v] * min(rep, 50))
                while cells and cells[-1] == '':
                    cells.pop()
                if cells:
                    yield sheet, cells
                el.clear()


def main(src, dst, first='2021-10-01'):
    first_date = dt.date.fromisoformat(first)
    by_day = {}
    for sheet, c in rows(src):
        # Columns: RefDate, Type, ISIN, Description, Maturity (mm/dd/yyyy), Mid Price, Mid Yield, ...
        if int(sheet[-4:]) < first_date.year or len(c) < 7 or not c[0][:4].isdigit():
            continue
        d = dt.date.fromisoformat(c[0][:10])
        if d < first_date:
            continue
        try:
            price, y = float(c[5]), float(c[6])
        except ValueError:
            continue
        if price == 0:
            continue
        m, dd, yy = c[4].split('/')
        t = (dt.date(int(yy), int(m), int(dd)) - d).days / 365.25
        if t < 0.25:
            continue
        by_day.setdefault(d, []).append((t, y, c[2]))

    with open(dst, 'w', newline='\n') as out:
        out.write('date,yield_5y_pct,lower_isin,lower_years,upper_isin,upper_years\n')
        for d in sorted(by_day):
            pts = sorted(by_day[d])
            lo = [p for p in pts if p[0] <= 5]
            hi = [p for p in pts if p[0] > 5]
            if not lo or not hi:
                print('skipped', d, file=sys.stderr)
                continue
            a, b = lo[-1], hi[0]
            y = a[1] + (b[1] - a[1]) * (5 - a[0]) / (b[0] - a[0])
            out.write(f'{d.isoformat()},{y * 100:.4f},{a[2]},{a[0]:.4f},{b[2]},{b[0]:.4f}\n')


if __name__ == '__main__':
    main(*sys.argv[1:])
