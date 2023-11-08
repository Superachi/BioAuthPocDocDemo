var email = document.getElementById('email');
async function SigninPasswordless(e) {
    e.preventDefault();
    console.log("click");

    const Client = Passwordless.Client;
    var p = new Client();

    // See passwordless-client.js for the method implementations
    // Let the API generate a verification token
    const { token, error } = await p.signinWithAlias(email);

    if (error) {
        console.error(error);
    } else {
        console.log(token);

        // Call the backend to verify the token.
        const verifiedUser = await fetch("/passwordless/signin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ "token": token })
        })

        // Refresh page
        if (verifiedUser.status == 200) {
            window.location.href = "/";
        }
    }
}

document.getElementById('passwordless-signin').addEventListener('click', SigninPasswordless);