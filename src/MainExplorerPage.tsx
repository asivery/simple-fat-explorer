import { CachedDirectory, FatFilesystem, LowLevelFatFilesystem } from 'nufatfs';
import { useEffect, useState } from 'react';
import { FatFSDirectoryEntry, FatFSDirectoryEntryAttributes } from 'nufatfs/dist/types';
import { VIRTUAL_ATTRIBUTE_CORRUPTED, capitalize, createStringChain, h, isSpecial, renderFlags } from './util';

export function ExpansiveButton({ onStateChanged }: { onStateChanged: (b: boolean) => void }) {
    const [selected, setSelected] = useState(false);
    return (
        <span
            className="simplebutton"
            onClick={() => {
                setSelected(!selected);
                onStateChanged(!selected);
            }}
        >
            {selected ? '-' : '+'}
        </span>
    );
}

export function StringifyMetadata({
    object,
    name,
    filter,
}: {
    name: string;
    object: { [key: string]: any } | null | undefined;
    filter?: (value: [string, any]) => boolean;
}) {
    const _filter = filter ?? (() => true);
    return (
        <fieldset>
            <legend>{name}</legend>
            {object === null || object === undefined
                ? '<Not Provided>'
                : Object.entries(object)
                      .filter(_filter)
                      .map(([name, value]) => {
                          if (typeof value === 'number') {
                              return (
                                  <div>
                                      {capitalize(name)}: {h(value)}
                                  </div>
                              );
                          } else if (typeof value === 'object') {
                              return (
                                  <div>
                                      {capitalize(name)}: {'<DATA>'}
                                  </div>
                              );
                          }
                      })}
        </fieldset>
    );
}

export function SingleNonChainedEntry({ data, ll, cls }: { data: FatFSDirectoryEntry; ll: LowLevelFatFilesystem; cls?: string }) {
    const [shown, setShown] = useState(false);
    const [chain, setChain] = useState<null | string>(null);
    useEffect(() => {
        setChain(createStringChain(ll, data._firstCluster));
    }, [ll, data]);
    return (
        <div
            className={`nonchainedentry ${cls} ${data.attribs === FatFSDirectoryEntryAttributes.EqLFN ? 'lfn' : ''} ${data.attribs & VIRTUAL_ATTRIBUTE_CORRUPTED ? 'corrupted' : ''}`}
        >
            <ExpansiveButton onStateChanged={setShown} />
            <span className="text">
                File: [{data._filenameStr}], Flags: {data.attribs & ~VIRTUAL_ATTRIBUTE_CORRUPTED} {renderFlags(data.attribs)} (size:{' '}
                {data.fileSize}) - @{h(data._firstCluster)}
            </span>
            {shown && <div className="indent">{chain}</div>}
        </div>
    );
}

export function DirectoryEntry({ entry, ll }: { entry: CachedDirectory; ll: LowLevelFatFilesystem }) {
    const [shown, setShown] = useState(false);

    const corrupted = (entry.underlying?.attribs || 0) & VIRTUAL_ATTRIBUTE_CORRUPTED;
    return (
        <div className={`directory ${corrupted && 'corrupted'}`}>
            <ExpansiveButton onStateChanged={setShown} />
            <span className="text">
                Directory: {entry.underlying?._filenameStr ?? '<Virtual>'} {corrupted && 'CORRUPTED!'}
            </span>
            {shown && (
                <div className="indent">
                    {entry.underlying ? (
                        <span>
                            Self: <SingleNonChainedEntry ll={ll} cls={'self'} data={entry.underlying} />
                        </span>
                    ) : (
                        <span className="text">{'<Virtual Element>'}</span>
                    )}
                    <div>Children:</div>
                    {entry.rawDirectoryEntries!.map((e) => {
                        console.log(e);
                        if (e instanceof CachedDirectory) {
                            return isSpecial(e.underlying) ? (
                                <SingleNonChainedEntry cls={'special'} ll={ll} data={e.underlying!} />
                            ) : (
                                <DirectoryEntry ll={ll} entry={e} />
                            );
                        } else {
                            return <SingleNonChainedEntry ll={ll} data={e} />;
                        }
                    })}
                </div>
            )}
        </div>
    );
}

export function MainExplorerPage({ toplevel }: { toplevel: FatFilesystem }) {
    const [underlying, setUnderlying] = useState<LowLevelFatFilesystem | null>(null);
    useEffect(() => {
        setUnderlying(toplevel.getUnderlying());
    }, [setUnderlying, toplevel]);
    if (!underlying) return <></>;
    return (
        <div>
            <fieldset name="Freelist">
                <legend>Freelist</legend>
                <p>There are {underlying?.allocator?.freelist.length} freelist entries</p>
                <ul>
                    {underlying?.allocator?.freelist.map((e) => (
                        <li>
                            Freelist entry: At cluster {e.startCluster.toString(16)} there is {e.length.toString(16)} free clusters
                        </li>
                    ))}
                </ul>
            </fieldset>
            <fieldset name="Metadata">
                <legend>Metadata</legend>
                <StringifyMetadata name="Bootsector Info" object={underlying.bootsectorInfo} />
                <StringifyMetadata name="Extended BIOS Parameter Block" object={underlying.fatBootInfo} />
                <StringifyMetadata name="FAT32 Extensions" object={underlying.fat32Extension} />
                <StringifyMetadata name="Misc." object={underlying} filter={([_, v]) => typeof v === 'number'} />
            </fieldset>
            <fieldset name="Files">
                <legend>Files</legend>
                <DirectoryEntry ll={underlying} entry={underlying.root!}></DirectoryEntry>
            </fieldset>
        </div>
    );
}
