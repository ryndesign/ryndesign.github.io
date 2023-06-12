<script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js" crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
<link href="https://nightly.datatables.net/fixedcolumns/css/fixedColumns.dataTables.css" rel="stylesheet" type="text/css" />
<script src="https://nightly.datatables.net/fixedcolumns/js/dataTables.fixedColumns.js"></script>
 
<script>
  $(document).ready(function () {

    $('#example').DataTable({    
        paging: false, 
        bLengthChange: false,
        info: false,
        bFilter: false,
        fixedColumns:   {
            left: 1,
            right: 0
        }
    });  

  });  
  
</script>

