const Registration = (function() {
    // This function sends a register request to the server
    // * `username`  - The username for the sign-in
    // * `avatar`    - The avatar of the user
    // * `name`      - The name of the user
    // * `password`  - The password of the user
    // * `onSuccess` - This is a callback function to be called when the
    //                 request is successful in this form `onSuccess()`
    // * `onError`   - This is a callback function to be called when the
    //                 request fails in this form `onError(error)`
    const register = function(username, avatar, name, password, onSuccess, onError) {
        const data = {
            username: username,
            avatar: avatar,
            name: name,
            password: password
          };
        // //
        // B. Sending the AJAX request to the server
        //


        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.json()) // Parse JSON response
        .then(json => {
            if (json.status === "error") {
                // If server responded with an error, pass the message to onError callback
                if (onError) onError(json.error);
            } else {
                // Successful registration, call onSuccess callback
                if (onSuccess) onSuccess(json);
                console.log("here");
            }
        })
        .catch(error => {
            if (onError) onError("Network or unexpected errors.");
        });
    };

    return { register };
})();
