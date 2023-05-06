const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");
const audioPlayer = document.getElementById("audioPlayer");

let mediaRecorder;
let recordedChunks = [];

recordButton.addEventListener("click", () => {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.addEventListener("dataavailable", (event) => {
        recordedChunks.push(event.data);
      });
      mediaRecorder.start();
      recordButton.disabled = true;
      stopButton.disabled = false;
    });
});

stopButton.addEventListener("click", () => {
  mediaRecorder.stop();
  mediaRecorder.addEventListener("stop", () => {
    const audioBlob = new Blob(recordedChunks, { type: "audio/wav" });
    const audioURL = URL.createObjectURL(audioBlob);
    audioPlayer.src = audioURL;

    // Save the audio file to the GitHub repository
    saveToGithub(audioBlob);

    recordedChunks = [];
    recordButton.disabled = false;
    stopButton.disabled = true;
  });
});

async function saveToGithub(audioBlob) {
  const githubToken = "<your_github_token>";
  const repoOwner = "<your_github_username>";
  const repoName = "<your_github_repo>";
  const filePath = "audio_files/audio.wav";

  // Convert the audio blob to base64
  const reader = new FileReader();
  reader.readAsDataURL(audioBlob);
  reader.onloadend = async () => {
    const base64Data = reader.result.split(",")[1];

    // Get the current commit sha
    const getCommitSha = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/main`, {
      headers: { "Authorization": `token ${githubToken}` }
    });
    const commitShaData = await getCommitSha.json();
    const currentCommitSha = commitShaData.object.sha;

    // Get the current tree sha
    const getTreeSha = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/commits/${currentCommitSha}`, {
      headers: { "Authorization": `token ${githubToken}` }
    });
    const treeShaData = await getTreeSha.json();
    const currentTreeSha = treeShaData.tree.sha;

    // Create a new tree with the updated file
    const createNewTree = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/trees`, {
      method: "POST",
      headers: {
        "Authorization": `token ${githubToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        base_tree: currentTreeSha,
        tree: [
          {
            path: filePath,
            mode: "100644",
            type: "blob",
            content: atob(base64Data)
          }
        ]
      })
    });
    const newTreeData = await createNewTree.json();
    const newTreeSha = newTreeData.sha;

    // Create a new commit
    const createNewCommit = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/commits`, {
      method: "POST",
      headers: {
        "Authorization": `token ${githubToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Add new audio file",
        tree: newTreeSha,
        parents: [currentCommitSha]
      })
    });
    const newCommitData = await createNewCommit.json();
