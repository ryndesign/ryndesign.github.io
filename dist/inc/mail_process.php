<?php
if (session_id() == "") session_start(); // Initialize Session data
ob_start();

if ($_POST) {

	$referer = $_SERVER['HTTP_REFERER'];

	//Declare Variables
	$name = $_POST['name'];
	$email = $_POST['email'];
	$email_link = "<a href='mailto:$email' style='color:#1d74a9;'>$email</a>";
	$phone = $_POST['phone'];
	$comment = $_POST['comment'];
	if(isset($_POST['g-recaptcha-response'])){$captcha=$_POST['g-recaptcha-response'];}

	$_SESSION["name"] = $name;
	$_SESSION["email"] = $email;
	$_SESSION["phone"] = $phone;
	$_SESSION["comment"] = $comment;
	$_SESSION['alert'] = '';

	$response = json_decode(file_get_contents("https://www.google.com/recaptcha/api/siteverify?secret=SECRET_KEY_GOES_HERE&response=".$captcha."&remoteip=".$_SERVER['REMOTE_ADDR']), true);

	if($response['success'] == false){

		$_SESSION['alert'] = 'Invalid Posting.';
		header('Location:'.$referer);
		exit();

	}else{

	//Validate The Form
		if(empty($name) || empty($email) || empty($comment) ){

			$_SESSION['alert'] = "You must fill in all the fields.";
			header('Location:'.$referer);
			exit();

		}else{

		   	$offset=4*60*60; //converting 4 hours to seconds.
	  		$dateFormat="D M j, Y @ G:i:s"; //set the date format
	  		$timeNdate=gmdate($dateFormat, time()-$offset); //get GMT date - 4

			//Send Email
			$msge="<html><head><title>New Inquiry From Website Inquiry</title></head><body>
				<span style='font-family:Arial, Helvetica, sans-serif; font-size:16px; color:#262626;font-weight:bold;'>New Inquiry From Website Inquiry On ".$timeNdate."</span><br /><br />
				<span style='font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#262626;'>

				<hr>
				<br />

				<b>Name:</b>  $name<br />
				<b>Email:</b>  $email_link<br />
				<b>Phone:</b>  $phone<br />
				<b>Question or Comments:</b>  $comment<br />
				<br />
	
				<hr>
				<br>
				
				Thank You,<br>
				Company Name
				</span>
				</body></html>";

			// To send HTML mail, the Content-type header must be set
			$headers  = 'MIME-Version: 1.0' . "\r\n";
			$headers .= 'Content-type: text/html; charset=iso-8859-1' . "\r\n";

			// Additional headers
			$headers .= "From: Website Inquiry <info@sitename.com>" . "\r\n";
			$headers .= "Cc: rnewport@ravenshoegroup.com". "\r\n";
			$subject = "New Inquiry From Website";
			// $to = 'emailaddress@sitename.com';
			$to = 'bcostoff@ravenshoegroup.com';
			mail($to, $subject, $msge, $headers);

			$_SESSION["name"] = "";
			$_SESSION["email"] = "";
			$_SESSION["phone"] = "";
			$_SESSION["comment"] = "";
			header('Location:../thankyou.php');
			exit();

		}

	}
}
else{
	header('Location:../index.php');
	exit();
}

?>