
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

        //
        // A. Preparing the user data
        //
        const data = {
            [username]:{
                avatar:avatar,
                name:name,
                password:password
            }
        }
        // //
        // B. Sending the AJAX request to the server
        //
        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          .then(response => {
            // Parse the JSON response regardless of status
            return response.json().then(json => {
                if (response.ok) {
                    console.log("Successful!");
                    if (onSuccess) onSuccess(json);
                } else {
                    console.log("Error!");
                    if (onError) onError(json);
                }
            });
        })
        .catch(error => {
            console.log("Error!");
            if (onError) onError(error);
        });
        

        
    };

    return { register };
})();
