import { read, write } from "./files.ts";

const fileSelect = document.body.appendChild(document.createElement("input"));
document.body.appendChild(document.createElement("br"));
const fileContents = document.body.appendChild(
  document.createElement("textarea"),
);
fileSelect.addEventListener("change", async () => {
  fileContents.disabled = true;
  const path = fileSelect.value;
  try {
    fileContents.value = await read(path);
  } catch (error) {
    fileContents.value = String(error);
  }
  fileContents.disabled = false;
});
fileContents.addEventListener("blur", async () => {
  write(fileSelect.value, fileContents.value);
});
