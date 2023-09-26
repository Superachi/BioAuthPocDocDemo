async function RegisterPasswordless(e) {
    e.preventDefault();

    const Client = Passwordless.Client;
    var p = new Client();

    // Call the backend to get a passwordless token
    var myToken = await fetch("/passwordless/getregistertoken").then(r => r.text());

    try {
        // See passwordless-client.js for the method implementations
        const result = await p.register(myToken);
        console.log(result);

        // Refresh page
        window.location.href = "/";
    } catch (e) {
        console.error("Things went bad: ", e);
    }
}

document.getElementById('passwordless-enable').addEventListener('click', RegisterPasswordless);