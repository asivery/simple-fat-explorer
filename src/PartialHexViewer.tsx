import { useEffect, useState } from 'react';
import { ArrowBarDownIcon, ArrowDownIcon } from './icons';
import './PartialHexViewer.css';

export default function PartialHexViewer({ canLoadMore, data, loadMore, loadAll }: { loadMore: () => void, loadAll: () => void, canLoadMore: boolean, data: Uint8Array }) {
    const [hexContents, setHexContents] = useState('');
    useEffect(() => {
        let out = "";
        for(let i = 0; i<data.length; i += 16){
            const row = data.subarray(i, i + 16);
            const rowHexStr = Array.from(row).map(e => e.toString(16).padStart(2, '0')).join(' ');
            const rowAsciiStr = Array.from(row).map(e => e >= 0x20 && e < 0x7F ? String.fromCharCode(e) : '.').join('');

            out += `${i.toString(16).padStart(8, '0')}\t${rowHexStr}${' '.repeat(47 - rowHexStr.length)}\t|${rowAsciiStr}${' '.repeat(16 - rowAsciiStr.length)}|\n`;
        }
        setHexContents(out);
    }, [data]);
    return (
        <div className='hexView'>
            <code>
                {hexContents || '<No Data>'}
            </code>
            {canLoadMore && (
                <div className='actionButtons'>
                    <span style={{margin: 'auto'}} onClick={loadMore}><ArrowDownIcon /></span>
                    <span style={{margin: 'auto'}} onClick={loadAll}><ArrowBarDownIcon /></span>
                </div>
            )}
        </div>
    )
}
