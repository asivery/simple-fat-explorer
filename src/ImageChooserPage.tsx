import { useCallback, useRef, useState } from 'react';
import { CachedDirectory, FatFilesystem } from 'nufatfs';
import { VIRTUAL_ATTRIBUTE_CORRUPTED, getNthPartitionFromMBR, isSpecial } from './util';

export function ImageChooserPage({ setImageFile }: { setImageFile: (imageFile: FatFilesystem) => void }) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [selectedPartition, setSelectedPartition] = useState(-1);
    const [sectorSize, setSectorSize] = useState(512);
    const handleAcceptFile = useCallback(async () => {
        console.log({ selectedPartition, sectorSize });
        try {
            const handle = inputRef.current!.files![0];
            if(!handle) return;
            const rawDriver = {
                numSectors: handle.size / sectorSize,
                sectorSize,
                async readSectors(startIndex: number, readSectors: number) {
                    return new Uint8Array(await handle.slice(startIndex * sectorSize, (startIndex + readSectors) * sectorSize).arrayBuffer());
                },
                writeSectors: null,
            };
            let driver = rawDriver;
            if (selectedPartition != -1) {
                const partInfo = getNthPartitionFromMBR(await rawDriver.readSectors(0, 1), selectedPartition);
                console.log(partInfo);
                driver = {
                    ...driver,
                    numSectors: partInfo.sectorCount,
                    readSectors(startIndex, readSectors) {
                        return rawDriver.readSectors(startIndex + partInfo.firstLBA, readSectors);
                    },
                };
            }
            const fs = await FatFilesystem.create(driver);
            async function cacheAllIn(root: CachedDirectory) {
                for (let entry of await root.getEntries()) {
                    if (entry instanceof CachedDirectory && !isSpecial(entry.underlying)) {
                        try {
                            await cacheAllIn(entry);
                        } catch (ex) {
                            console.error('While caching ' + entry.underlying!._filenameStr);
                            console.error(ex);
                            entry.rawDirectoryEntries = [];
                            entry.underlying!.attribs |= VIRTUAL_ATTRIBUTE_CORRUPTED;
                        }
                    }
                }
            }
            await cacheAllIn(fs.getUnderlying().root!);
            (window as any).fs = fs;
            console.log(fs.getUnderlying().root!);
            setImageFile(fs);
        }catch(ex){
            window.alert(ex);
            inputRef.current!.value = '';
        }
    }, [selectedPartition, inputRef, setImageFile, sectorSize]);
    const handleAskForFile = useCallback(() => {
        inputRef.current!.click();
    }, [inputRef]);

    return (
        <div className="selector">
            <h2>Simple FAT Explorer</h2>
            <label>
                Select Partition:
                <select value={selectedPartition} onChange={(e) => setSelectedPartition(parseInt(e.target.value as any))}>
                    <option value={-1}>Whole Image</option>
                    <option value={0}>MBR Parition 1</option>
                    <option value={1}>MBR Parition 2</option>
                    <option value={2}>MBR Parition 3</option>
                    <option value={3}>MBR Parition 4</option>
                </select>
            </label>
            <label>
                Sector Size: <input type="number" value={sectorSize} onChange={(e) => setSectorSize(parseInt(e.target.value as any))} />
            </label>
            <button onClick={handleAskForFile}>Open Image</button>
            <input hidden={true} ref={inputRef} onChange={handleAcceptFile} type="file" />
        </div>
    );
}
