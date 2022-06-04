<?php
if (session_id() == "") session_start(); // Initialize Session data
ob_start();
require_once("functions.php");

	if(isset($_POST['email_to'])) {
		if(empty($db)){
			$dbConnection = new \RSG\dbConnection();
			$db = new \RSG\MySQL($dbConnection->host,$dbConnection->userdb,$dbConnection->pass,$dbConnection->dbname);
		}

		// value sent from form
		$email_to=$_POST['email_to'];
		$email_to = mysqli_real_escape_string($db->dbConn,$email_to);

		$sql= "SELECT * FROM `user` WHERE `email` = '$email_to' ";
		$results = $db->query($sql);
		$row=$results->fetch();

		// retrieve password from table where e-mail = $email_to
		if($row>0){

			$newpass=randomPassword();
      		$sql = "update user set password = '".md5(Const_Salt. $newpass) ."' WHERE `email` = '$email_to'  limit 1;";
      		$db->query($sql);

			$your_password=$newpass;
			$user_first_name=$row['first_name'];
			//$messages = file_get_contents('http://www.example.com/');

			//Email Variables
			//die($newpass);
			$to=$email_to;
			$subject="Company Name: Your Requested Password";
			$header  = 'MIME-Version: 1.0' . "\r\n";
			$header .= 'Content-type: text/html; charset=iso-8859-1' . "\r\n";
			$header .= "from: Company Name login <info@companyname.com>";
			$messages = file_get_contents('getpassword-email.txt');
			$messages = str_replace('[[USER]]', $user_first_name, $messages);
			$messages = str_replace('[[USERPASSWORD]]', $your_password, $messages);

			// send email
			$sentmail = mail($to,$subject,$messages,$header);

			// if your email succesfully sent
			if($sentmail){
				$_SESSION['error'] = 'Your password has been sent to your email address.';
				header('location:forgot-password.php');
				exit();
				//echo "Your Password Has Been Sent To Your Email Address.";
			}else{
				$_SESSION['error'] = 'Cannot send password to your e-mail address';
				header('location:forgot-password.php');
				exit();
			//	//echo "Cannot send password to your e-mail address";
			}

		}else{
			$_SESSION['error'] = 'The email entered does not exist in our records.';
				// else if $count not equal 1
			header('location:forgot-password.php');
			exit();
				//echo "Not found your email in our database";
		}
	}

	function randomPassword() {
    $alphabet = "a2hUbcX756rstLAqYZ0gKQBCDElGmnpfNRSTFHJuw34x8MWydePjkz9";
    $pass = array(); //remember to declare $pass as an array
    $alphaLength = strlen($alphabet) - 1; //put the length -1 in cache
    for ($i = 0; $i < 8; $i++) {
        $n = rand(0, $alphaLength);
        $pass[] = $alphabet[$n];
    }
    	return implode($pass); //turn the array into a string
	}

	function checkEmail($email) {
	  if(preg_match("/^([a-zA-Z0-9])+([a-zA-Z0-9\._-])
	  ?*@([a-zA-Z0-9_-])+([a-zA-Z0-9\._-]+)+$/",
				   $email)){
		list($username,$domain)=split('@',$email);
		if(!checkdnsrr($domain,'MX')) {
		  return false;
		}
		return true;
	  }
	  return false;
	}

?>