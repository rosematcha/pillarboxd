import {
  useRef,
  useState,
  type DragEvent,
  type InputHTMLAttributes,
} from "react";

export function Dropzone({
  accept,
  id = "file-upload",
  name,
  required,
}: Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "accept" | "id" | "name" | "required"
>): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const acceptDrop = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file === undefined || inputRef.current === null) {
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    setFileName(file.name);
  };

  return (
    <label
      htmlFor={id}
      className={[
        "gap-tight rounded-control px-section py-step ease-feedback has-[:focus-visible]:outline-accent flex cursor-pointer flex-col items-center border border-dashed text-center text-sm transition-[border-color,background-color] duration-[var(--duration-feedback)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
        dragging
          ? "border-accent bg-accent/6 text-text"
          : "border-border text-muted hover:border-accent hover:bg-accent/6",
      ].join(" ")}
      onDragEnter={() => {
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setDragging(false);
      }}
      onDrop={acceptDrop}
    >
      <span className="text-text font-medium">
        {fileName ?? "Drop your Letterboxd export .zip here"}
      </span>
      <span>
        or <span className="text-accent">browse files</span>
      </span>
      <input
        ref={inputRef}
        id={id}
        type="file"
        name={name}
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(event) => {
          setFileName(event.currentTarget.files?.[0]?.name ?? null);
        }}
      />
    </label>
  );
}
