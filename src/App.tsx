import { useState } from 'react';
import { ImageChooserPage } from './ImageChooserPage';
import type { FatFilesystem } from 'nufatfs';
import { MainExplorerPage } from './MainExplorerPage';

function App() {
    const [filesystemToplevel, setFilesystemToplevel] = useState<FatFilesystem | null>(null);

    return (
        <>
            {filesystemToplevel == null ? (
                <ImageChooserPage setImageFile={setFilesystemToplevel} />
            ) : (
                <MainExplorerPage toplevel={filesystemToplevel} />
            )}
        </>
    );
}

export default App;
