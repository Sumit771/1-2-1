import React, {useEffect, useRef, useState} from 'react'
import imageCompression from 'browser-image-compression'
import api from '../services/api'

export default function ImageUploader({
  onUploaded,
  onStatus,
}:{
  onUploaded:(url:string)=>void
  onStatus?: (s: { stage: 'idle' | 'compressing' | 'uploading' | 'done' | 'error'; progress?: number; previewUrl?: string }) => void
}){
  const [compressing,setCompressing] = useState(false)
  const [progress,setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(()=>{
    return ()=>{
      if(previewUrl) URL.revokeObjectURL(previewUrl)
    }
  },[previewUrl])

  async function handleFile(e:React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]
    if(!file) return

    // show preview immediately
    if(previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    try{
      setCompressing(true)
      onStatus?.({ stage: 'compressing', progress: 0, previewUrl: url })
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.7
      }

      const compressedFile = await imageCompression(file, options)

      // Upload via formdata
      const form = new FormData()
      form.append('image', compressedFile, compressedFile.name)

      const res = await api.post('/images/upload', form, {
        headers: {'Content-Type': 'multipart/form-data'},
        onUploadProgress: (ev)=>{
          if(ev.total){
            const p = Math.round((ev.loaded/ev.total)*100)
            setProgress(p)
            onStatus?.({ stage: 'uploading', progress: p, previewUrl: url })
          }
        }
      })

      onUploaded(res.data.imageUrl)
      onStatus?.({ stage: 'done', progress: 100, previewUrl: url })
      await new Promise(r => setTimeout(r, 500))
    }catch(err:any){
      console.error(err)
      onStatus?.({ stage: 'error' })
      alert(err?.response?.data?.error || 'Upload failed')
    }finally{
      setCompressing(false)
      setProgress(0)
      onStatus?.({ stage: 'idle', progress: 0 })
      // clear the file input so selecting same file again triggers change
      if(inputRef.current) inputRef.current.value = ''
      // Delay revocation to ensure UI has updated and stopped using the blob
      setTimeout(() => setPreviewUrl(null), 100)
    }
  }

  return (
    <div className="wa-uploader">
      {previewUrl && (
        <div className="wa-attach-preview" aria-label="Selected image preview">
          <img src={previewUrl} alt="preview" />
          <button
            type="button"
            className="wa-attach-remove"
            onClick={()=>{
              if(compressing) return
              URL.revokeObjectURL(previewUrl)
              setPreviewUrl(null)
              if(inputRef.current) inputRef.current.value = ''
            }}
            aria-label="Remove attachment"
            disabled={compressing}
            title={compressing ? 'Uploading…' : 'Remove'}
          >
            ✕
          </button>
          {compressing && (
            <div className="wa-attach-progress" aria-label="Upload progress">
              <div className="wa-attach-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}} disabled={compressing} />
      <button 
        type="button" 
        aria-label="Attach image" 
        disabled={compressing} 
        onClick={() => inputRef.current?.click()}
        style={{cursor: 'pointer'}}
      >📷</button>
      {compressing && <div className="wa-subtle">Uploading… {progress}%</div>}
    </div>
  )
}
